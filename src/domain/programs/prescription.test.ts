import { describe, expect, it } from 'vitest'

import { describePrescription, describeReps, nominalReps } from './prescription'

/*
 * How a planned set reads on screen. The `rpe` and `rts-backoff` kinds
 * are prescribed by nothing now, but every session filed under RTS
 * still carries them — a log describes itself — so their wording is
 * what a lifter reads opening an old session, and nothing else would
 * notice it breaking.
 */
describe('describing a planned set', () => {
  const range = { kind: 'range', low: 5, high: 10 } as const

  it('reads reps first, effort as a qualifier, for an RTS top set', () => {
    expect(describePrescription({ load: { kind: 'rpe', target: 8 }, reps: range })).toBe(
      '5–10 @ RPE 8',
    )
  })

  it('reads an RTS back-off with and without its stopping RPE', () => {
    const backoff = { kind: 'rts-backoff', dropPercent: 5, topSetReps: 3, topSetRpe: 8 } as const
    expect(describePrescription({ load: backoff, reps: range })).toBe('5–10 at 5% off the top set')
    expect(describePrescription({ load: { ...backoff, stopRpe: 8 }, reps: range })).toBe(
      '5–10 at 5% off the top set, until RPE 8',
    )
  })

  it('shows the reps actually asked for once they are known', () => {
    expect(describePrescription({ load: { kind: 'rpe', target: 8 }, reps: range }, 3)).toBe(
      '3 @ RPE 8',
    )
  })

  it('leaves the load out where only a session can say it', () => {
    expect(describePrescription({ load: { kind: 'working' }, reps: range })).toBe('5–10')
    expect(describePrescription({ load: { kind: 'open' }, reps: range })).toBe('5–10')
  })

  it('reads a stated load as weight by reps', () => {
    const reps = { kind: 'fixed', reps: 5 } as const
    expect(describePrescription({ load: { kind: 'absolute', load: 225 }, reps })).toBe('225 × 5')
    expect(describePrescription({ load: { kind: 'percent-e1rm', percent: 80 }, reps })).toBe(
      '80% e1RM × 5',
    )
    expect(describePrescription({ load: { kind: 'bodyweight' }, reps })).toBe('BW × 5')
    expect(describePrescription({ load: { kind: 'bodyweight', addedLoad: 25 }, reps })).toBe(
      'BW +25 × 5',
    )
  })
})

describe('describing reps', () => {
  it.each([
    [{ kind: 'fixed', reps: 3 }, '3'],
    [{ kind: 'amrap', minimum: 5 }, '5+'],
    [{ kind: 'time', seconds: 45 }, '45s'],
    [{ kind: 'time', seconds: 1800 }, '30 min'],
    [{ kind: 'time', seconds: 90 }, '1:30'],
  ] as const)('reads %o as %s', (reps, words) => {
    expect(describeReps(reps)).toBe(words)
  })
})

describe('the reps to plan for', () => {
  it('takes the middle of a range, the floor of an AMRAP, and nothing for a clock', () => {
    expect(nominalReps({ kind: 'range', low: 15, high: 30 })).toBe(23)
    expect(nominalReps({ kind: 'amrap', minimum: 5 })).toBe(5)
    expect(nominalReps({ kind: 'time', seconds: 600 })).toBe(0)
    expect(nominalReps({ kind: 'fixed', reps: 4 })).toBe(4)
  })
})
