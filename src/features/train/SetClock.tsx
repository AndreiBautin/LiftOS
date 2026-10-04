import { Square, Timer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useServices, useSettings } from '@/app/context'
import { TEMPOS, tempoAt, type Tempo, type TempoPhase } from '@/domain/programs/tempo'
import { cn } from '@/lib/cn'

import { playRestCue, primeRestSounds } from './rest-sounds'

const PHASE_WORDS: Readonly<Record<TempoPhase, string>> = {
  lower: 'Lower',
  hold: 'Hold',
  lift: 'Lift',
}

/**
 * Times a set while it is done: tap Start, lift, tap Stop — and with a
 * tempo chosen (2-0-1, 3-1-1, 4-0-2), it calls each part of every rep as
 * it comes, counting the seconds down, and ticks on each change when rest
 * sounds are on (`tempoAt`, the same synthesised tick).
 *
 * **It records nothing.** The time under the bar is a reading for the
 * lifter, not a field on the set — a log that asked for it would be
 * asking every set for a number most sets do not need. Stopping leaves
 * the time on screen until the next start.
 */
export function SetClock() {
  const { settings } = useSettings()
  const clock = useServices().clock
  const [tempo, setTempo] = useState<Tempo | undefined>(undefined)
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined)
  const [now, setNow] = useState(0)
  const [last, setLast] = useState<number | undefined>(undefined)
  const lastPhase = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (startedAt === undefined) return
    const tick = (): void => {
      setNow(clock.now().getTime())
    }
    tick()
    const handle = window.setInterval(tick, 100)
    return () => {
      window.clearInterval(handle)
    }
  }, [startedAt, clock])

  const elapsed = startedAt === undefined ? 0 : Math.max(0, now - startedAt)
  const reading =
    tempo === undefined || startedAt === undefined ? undefined : tempoAt(tempo, elapsed)

  /* A tick as each part of a rep begins — on the change, never on a repeat reading. */
  const phaseKey = reading === undefined ? undefined : `${String(reading.rep)}-${reading.phase}`
  useEffect(() => {
    if (phaseKey === undefined) {
      lastPhase.current = undefined
      return
    }
    if (lastPhase.current !== undefined && lastPhase.current !== phaseKey && settings.restSounds) {
      playRestCue('tick')
    }
    lastPhase.current = phaseKey
  }, [phaseKey, settings.restSounds])

  const running = startedAt !== undefined

  return (
    <div className="border-ink-800 mt-3 rounded-xl border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Timer size={15} className="text-ink-500 shrink-0" aria-hidden />
        <div className="flex flex-1 flex-wrap gap-1" role="group" aria-label="Tempo">
          {[{ label: 'No tempo', tempo: undefined }, ...TEMPOS].map((option) => {
            const on = option.tempo === tempo
            return (
              <button
                key={option.label}
                type="button"
                disabled={running}
                aria-pressed={on}
                onClick={() => {
                  setTempo(option.tempo)
                }}
                className={cn(
                  'numeric rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60',
                  on
                    ? 'border-accent-500/60 bg-accent-500/15 text-accent-400'
                    : 'border-ink-800 text-ink-300',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            if (running) {
              setLast(elapsed)
              setStartedAt(undefined)
              return
            }
            // Inside the tap: iOS only wakes audio during a gesture.
            if (settings.restSounds && tempo !== undefined) primeRestSounds()
            const at = clock.now().getTime()
            setNow(at)
            setStartedAt(at)
          }}
          className={cn(
            'tap-target flex shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold',
            running ? 'bg-bad-500/15 text-bad-500' : 'bg-accent-500/15 text-accent-400',
          )}
        >
          {running ? <Square size={13} aria-hidden /> : null}
          {running ? 'Stop' : 'Time the set'}
        </button>
      </div>

      {running ? (
        <div className="mt-2 flex items-end justify-between gap-3" aria-live="off">
          <p className="numeric text-ink-50 text-4xl leading-none font-semibold">
            {(elapsed / 1000).toFixed(1)}
            <span className="text-ink-500 ml-1 text-base">s</span>
          </p>
          {reading !== undefined && (
            <div className="text-right">
              <p
                key={phaseKey}
                className={cn(
                  'tempo-phase text-2xl font-semibold',
                  reading.phase === 'lift' ? 'text-accent-400' : 'text-ink-50',
                )}
              >
                {PHASE_WORDS[reading.phase]} {reading.left}
              </p>
              <p className="numeric text-ink-500 text-xs">Rep {reading.rep}</p>
            </div>
          )}
        </div>
      ) : (
        last !== undefined && (
          <p className="text-ink-500 mt-1.5 text-xs">
            Last set took{' '}
            <span className="numeric text-ink-100 font-semibold">{(last / 1000).toFixed(1)} s</span>{' '}
            under the bar.
          </p>
        )
      )}
    </div>
  )
}
