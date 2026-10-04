/** Seconds for each part of a rep: down, held at the bottom, up. */
export interface Tempo {
  readonly lower: number
  readonly hold: number
  readonly lift: number
}

export type TempoPhase = 'lower' | 'hold' | 'lift'

export const TEMPOS: readonly { readonly label: string; readonly tempo: Tempo }[] = [
  { label: '2-0-1', tempo: { lower: 2, hold: 0, lift: 1 } },
  { label: '3-1-1', tempo: { lower: 3, hold: 1, lift: 1 } },
  { label: '4-0-2', tempo: { lower: 4, hold: 0, lift: 2 } },
]

export interface TempoReading {
  /** The rep under way, from 1. */
  readonly rep: number
  readonly phase: TempoPhase
  /** Whole seconds left in the phase, counted down as a metronome says them. */
  readonly left: number
}

/**
 * Where a set is in its tempo after so long: which rep, which part of it,
 * and how many seconds of that part remain.
 *
 * **A part of nought seconds is skipped**, not passed through for an
 * instant — a 2-0-1 rep has no hold, and a reading that flickered "hold"
 * between lowering and lifting would sound a tick for nothing.
 */
export function tempoAt(tempo: Tempo, elapsedMs: number): TempoReading {
  const parts = (
    [
      ['lower', tempo.lower],
      ['hold', tempo.hold],
      ['lift', tempo.lift],
    ] as const
  ).filter(([, seconds]) => seconds > 0)
  const repMs = parts.reduce((sum, [, seconds]) => sum + seconds * 1000, 0)
  if (repMs <= 0) return { rep: 1, phase: 'lift', left: 0 }
  const at = Math.max(0, elapsedMs)
  const rep = Math.floor(at / repMs) + 1
  let into = at % repMs
  for (const [phase, seconds] of parts) {
    const length = seconds * 1000
    if (into < length) return { rep, phase, left: Math.ceil((length - into) / 1000) }
    into -= length
  }
  return { rep, phase: 'lift', left: 0 }
}
