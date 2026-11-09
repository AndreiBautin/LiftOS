import { Pause, Play } from 'lucide-react'
import { RollingNumber } from '@/components/shared/RollingNumber'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { restCuesBetween } from '@/domain/programs/rest-cues'

import { playRestCue } from './rest-sounds'
import { useHaptics } from '@/features/feel/haptics'

import { Button } from '@/components/shared/primitives'

/**
 * The rest, as the whole screen.
 *
 * **Resting is most of a session**, and it was a capsule over a set list you
 * were not using. Between sets a lifter wants three things from across a rack:
 * how long is left, what goes on the bar, and how the last set went. So those
 * are all there is, and the screen goes when the rest does.
 *
 * Derived from an absolute start time passed in as a prop rather than
 * counting a number down, because a phone locked between sets suspends
 * the tab and any interval with it. A countdown implemented as
 * `remaining -= 1` every second would pause with the screen and report
 * ninety seconds of rest after four minutes in a pocket — worse than no
 * timer, because it is trusted.
 */

interface Props {
  /** When the set that triggered this was logged, as epoch milliseconds. */
  readonly startedAt: number
  readonly seconds: number
  /** Why this long — "Heavy lift", "Isolation · short set". */
  readonly reason?: string | undefined
  /**
   * The set this rest leads up to, so the bar can be loaded while the clock
   * runs rather than after it. Absent once nothing is pending.
   */
  readonly next?:
    | {
        readonly title: string
        readonly detail: string
        /** What to do to the bar: "Bar stays loaded", or the plates a side. */
        readonly bar?: string | undefined
      }
    | undefined
  readonly onDismiss: () => void
  /** Ticks and a chime; see `restCuesBetween`. */
  readonly sounds?: boolean
  /** The session's figures, since this covers the bar that carries them. */
  readonly header: ReactNode
  /** The set just logged and how it did. */
  readonly logged: ReactNode
}

export function RestTimer({
  startedAt,
  seconds,
  reason,
  next,
  onDismiss,
  sounds = false,
  header,
  logged,
}: Props) {
  /**
   * Milliseconds the lifter has spent with the timer paused. Kept as a
   * shift applied to the deadline rather than as a stopped clock, so the
   * remaining time is still a pure function of the wall clock.
   */
  const haptic = useHaptics()
  const [pausedFor, setPausedFor] = useState(0)
  const [pausedAt, setPausedAt] = useState<number | undefined>(undefined)
  /** Time the lifter added with +30s. A shift on the deadline, like a pause. */
  const [extraMs, setExtraMs] = useState(0)
  const [now, setNow] = useState(startedAt)

  const endsAt = startedAt + pausedFor + extraMs + seconds * 1000
  const remaining =
    pausedAt === undefined ? Math.max(0, endsAt - now) : Math.max(0, endsAt - pausedAt)

  useEffect(() => {
    if (pausedAt !== undefined) return

    const tick = (): void => {
      setNow(Date.now())
    }

    tick()
    // Recomputed from the wall clock every tick, so a suspended tab
    // catches up the moment it resumes instead of losing the time.
    const handle = window.setInterval(tick, 250)

    const onVisible = (): void => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pausedAt])

  const elapsed = remaining <= 0

  /*
   * **The end of a rest is felt as well as seen**, once, on the change —
   * a phone face up on a bench is not being looked at. Android buzzes; iOS
   * gives a web app no vibration API, so there it is the colour alone.
   */
  useEffect(() => {
    if (!elapsed) return
    haptic('restOver')
  }, [elapsed, haptic])
  /*
   * **Sounds fire on a crossing of the time left**, compared with the
   * reading before; see `restCuesBetween` for why not on equality.
   */
  const lastRemaining = useRef(remaining)
  useEffect(() => {
    const before = lastRemaining.current
    lastRemaining.current = remaining
    if (!sounds || pausedAt !== undefined) return
    for (const cue of restCuesBetween(before, remaining)) playRestCue(cue)
  }, [remaining, sounds, pausedAt])
  const total = seconds * 1000 + extraMs
  const left = total <= 0 ? 0 : Math.min(1, remaining / total)

  const ring = 2 * Math.PI * 138

  return (
    <div
      className="session-player bg-ink-950 fixed inset-0 z-30 flex justify-center px-5"
      style={{
        paddingTop: 'calc(0.875rem + var(--safe-top))',
        paddingBottom: 'calc(1.25rem + var(--safe-bottom))',
      }}
      role="dialog"
      aria-label="Resting"
    >
      <div className="flex w-full max-w-md flex-col">
        {header}
        <div className="mt-3">{logged}</div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <div className="relative aspect-square min-h-0 w-full max-w-[19rem]">
            <svg viewBox="0 0 300 300" className="size-full -rotate-90" aria-hidden>
              <circle
                cx="150"
                cy="150"
                r="138"
                fill="none"
                stroke="var(--color-ink-900)"
                strokeWidth="12"
              />
              <circle
                cx="150"
                cy="150"
                r="138"
                fill="none"
                stroke={elapsed ? 'var(--color-good-500)' : 'var(--color-accent-400)'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - left)}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              role="status"
            >
              <p className="font-display text-[5.5rem] leading-none font-bold tracking-[-0.04em]">
                {elapsed ? 'Go' : <RollingNumber value={formatRemaining(remaining)} />}
              </p>
              <p className="text-ink-500 mt-1.5 text-[0.9375rem]">
                {elapsed
                  ? 'Rest complete'
                  : pausedAt !== undefined
                    ? 'Paused'
                    : reason !== undefined && reason !== ''
                      ? reason
                      : 'Resting'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button
              variant="outline"
              className="h-12 w-24 rounded-[0.875rem]"
              aria-label="Add thirty seconds of rest"
              onClick={() => {
                setExtraMs((current) => current + 30_000)
              }}
            >
              +30s
            </Button>
            <Button
              variant="outline"
              className="h-12 w-28 rounded-[0.875rem]"
              aria-label={pausedAt === undefined ? 'Pause rest timer' : 'Resume rest timer'}
              onClick={() => {
                if (pausedAt === undefined) {
                  setPausedAt(Date.now())
                } else {
                  setPausedFor((current) => current + (Date.now() - pausedAt))
                  setPausedAt(undefined)
                }
              }}
            >
              {pausedAt === undefined ? (
                <Pause size={16} aria-hidden />
              ) : (
                <Play size={16} aria-hidden />
              )}
              {pausedAt === undefined ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>

        {next !== undefined && (
          <div className="border-ink-800 border-t pt-3.5">
            <p className="text-ink-500 truncate text-sm">Next · {next.title}</p>
            <div className="mt-0.5 flex items-baseline justify-between gap-3">
              <span className="font-display min-w-0 truncate text-[2.5rem] leading-tight font-bold tracking-tight">
                {next.detail}
              </span>
              {next.bar !== undefined && (
                <span className="text-ink-500 numeric shrink-0 text-right text-[0.9375rem]">
                  {next.bar}
                </span>
              )}
            </div>
          </div>
        )}

        <Button
          variant={elapsed ? 'primary' : 'outline'}
          full
          className="font-display mt-3 h-[4.5rem] shrink-0 rounded-[1.25rem] text-xl"
          onClick={onDismiss}
        >
          Ready now
        </Button>
      </div>
    </div>
  )
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}
