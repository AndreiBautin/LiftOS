import { Play, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useServices } from '@/app/context'
import type { LoggedSet } from '@/domain/logging/workout-log'
import { emomAt, emomCuesBetween, type EmomCue } from '@/domain/programs/emom'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { useHaptics } from '@/features/feel/haptics'
import { cn } from '@/lib/cn'

import { playEmomCue, primeRestSounds } from './rest-sounds'

/** Seconds of count-in before the first minute: time to pick the bell up. */
const COUNT_IN = 5

const HAPTIC_FOR = {
  tick: 'detent',
  go: 'restOver',
  done: 'finished',
} as const satisfies Record<EmomCue, string>

/**
 * Runs an EMOM: a count-in, then every minute named and counted down, a
 * tick in its last three seconds and a go at the top of the next, and the
 * set logged as planned when the last minute ends — asked for as _"add
 * some sort of emom timer into the app so its not a single checkmark"_.
 *
 * **Read from an absolute start**, the rest timer's rule, so a locked
 * phone loses no time: the reading jumps on unlocking and sounds only the
 * latest cue (`emomCuesBetween`). Stop abandons the clock and logs
 * nothing; the row's own check and editor still log by hand, and the
 * logged reps can be corrected there afterwards.
 *
 * Lives on the exercise card, so turning the page away resets it.
 */
export function EmomTimer({
  set,
  units,
  onFinish,
}: {
  readonly set: LoggedSet
  readonly units: WeightUnit
  readonly onFinish: () => void
}) {
  const clock = useServices().clock
  const haptic = useHaptics()
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined)
  const [now, setNow] = useState(0)
  const previous = useRef<number | undefined>(undefined)
  const finish = useRef(onFinish)

  useEffect(() => {
    finish.current = onFinish
  }, [onFinish])

  const { reps } = set.prescription
  const minutes = reps.kind === 'emom' ? reps.minutes : 0
  const perMinute = set.plannedReps ?? (reps.kind === 'emom' ? reps.reps : 0)
  const running = startedAt !== undefined
  const elapsed = startedAt === undefined ? 0 : now - startedAt

  useEffect(() => {
    if (startedAt === undefined) return
    const tick = (): void => {
      setNow(clock.now().getTime())
    }
    tick()
    const handle = window.setInterval(tick, 250)
    return () => {
      window.clearInterval(handle)
    }
  }, [startedAt, clock])

  /* Cues on a crossing; at the end, the clock stops and the set is logged. */
  useEffect(() => {
    if (startedAt === undefined) {
      previous.current = undefined
      return
    }
    const before = previous.current ?? Number.NEGATIVE_INFINITY
    previous.current = elapsed
    const cues = emomCuesBetween(before, elapsed, minutes)
    for (const cue of cues) {
      playEmomCue(cue)
      haptic(HAPTIC_FOR[cue])
    }
    // Once: `previous` now sits past the end, so nothing crosses it again.
    if (cues.includes('done')) finish.current()
  }, [elapsed, startedAt, minutes, haptic])

  if (reps.kind !== 'emom' || set.outcome !== 'pending') return null

  const reading = emomAt(elapsed, minutes)
  const countingIn = running && elapsed < 0
  const bell = set.plannedLoad === undefined ? undefined : formatLoad(set.plannedLoad, units)

  return (
    <div className="well mt-3 px-3 py-3">
      {running && !reading.done ? (
        <div aria-live="off">
          <div className="flex items-center gap-4">
            <p className="numeric text-ink-50 w-16 shrink-0 text-5xl leading-none font-semibold">
              {countingIn ? Math.ceil(-elapsed / 1000) : reading.secondsLeft}
            </p>
            <div className="min-w-0 flex-1">
              <p className="text-ink-50 text-lg font-semibold">
                {countingIn ? 'Get ready' : `Minute ${String(reading.round)} of ${String(minutes)}`}
              </p>
              <p className="text-ink-300 text-sm">
                {String(perMinute)} reps{bell === undefined ? '' : ` · ${bell}`}
              </p>
            </div>
          </div>
          {/* The strip and Stop share a row of their own, so the title never wraps at 375. */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex flex-1 gap-1" aria-hidden>
              {Array.from({ length: minutes }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 flex-1 rounded-full',
                    countingIn || index + 1 > reading.round
                      ? 'bg-ink-800'
                      : index + 1 === reading.round
                        ? 'bg-accent-400'
                        : 'bg-good-500',
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setStartedAt(undefined)
              }}
              className="tap-target bg-bad-500/15 text-bad-500 flex shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
            >
              <Square size={14} aria-hidden />
              Stop
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-ink-300 min-w-0 flex-1 text-sm">
            Every minute for {String(minutes)} min. Logs itself at the end.
          </p>
          <button
            type="button"
            onClick={() => {
              // Inside the tap: iOS only wakes audio during a gesture.
              primeRestSounds()
              const at = clock.now().getTime()
              setNow(at)
              setStartedAt(at + COUNT_IN * 1000)
            }}
            className="tap-target bg-accent-500/15 text-accent-400 flex shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"
          >
            <Play size={14} aria-hidden />
            Start EMOM
          </button>
        </div>
      )}
    </div>
  )
}
