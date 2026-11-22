import { describe, expect, it } from 'vitest'

import { describeActivity, parseActivity, statedReps, tallyActivities } from './activity'

const base = {
  id: 'evt-000001',
  day: '2026-11-21',
  exercise: 'Curls',
  amount: { kind: 'total', reps: 100, per: 'total' },
  source: 'jarvis',
  createdAt: '2026-11-21T18:00:00.000Z',
  updatedAt: '2026-11-21T18:00:00.000Z',
}

describe('parseActivity', () => {
  it('reads a day total as a total, with no sets invented', () => {
    const entry = parseActivity(base)
    expect(entry?.amount).toEqual({ kind: 'total', reps: 100, per: 'total' })
    expect(entry !== undefined && describeActivity(entry)).toBe('Curls · 100 reps total')
  })

  it('keeps "per side" apart from "total"', () => {
    const entry = parseActivity({ ...base, amount: { kind: 'total', reps: 50, per: 'per-side' } })
    expect(entry !== undefined && statedReps(entry)).toEqual({ reps: 50, per: 'per-side' })
    expect(entry !== undefined && describeActivity(entry)).toBe('Curls · 50 reps per side')
  })

  it('refuses a load without the unit it was said in', () => {
    const sets = { kind: 'sets', per: 'total', sets: [{ reps: 12, load: 25 }] }
    expect(parseActivity({ ...base, amount: sets })).toBeUndefined()
    expect(parseActivity({ ...base, amount: sets, unit: 'lb' })?.unit).toBe('lb')
  })

  it('keeps a set without a load as having no load, not zero', () => {
    const entry = parseActivity({
      ...base,
      exercise: 'Push-ups',
      amount: { kind: 'sets', per: 'total', sets: [{ reps: 20 }, { reps: 15 }] },
    })
    expect(entry?.amount).toEqual({
      kind: 'sets',
      per: 'total',
      sets: [{ reps: 20 }, { reps: 15 }],
    })
    expect(entry !== undefined && describeActivity(entry)).toBe('Push-ups · 2 sets total (20, 15)')
  })

  it.each([
    ['a missing scope', { ...base, amount: { kind: 'total', reps: 100 } }],
    ['zero reps', { ...base, amount: { kind: 'total', reps: 0, per: 'total' } }],
    ['fractional reps', { ...base, amount: { kind: 'total', reps: 10.5, per: 'total' } }],
    ['an impossible day', { ...base, day: '2026-02-30' }],
    ['an unknown source', { ...base, source: 'guess' }],
    ['a short id', { ...base, id: 'x' }],
    ['an empty name', { ...base, exercise: '   ' }],
    ['not an object', 'curls'],
  ])('refuses %s', (_label, row) => {
    expect(parseActivity(row)).toBeUndefined()
  })
})

describe('tallyActivities', () => {
  it('never adds per-side reps to totals, and counts no sets from a total', () => {
    const rows = [
      base,
      {
        ...base,
        id: 'evt-000002',
        exercise: 'curls',
        amount: { kind: 'total', reps: 40, per: 'per-side' },
      },
      { ...base, id: 'evt-000003', amount: { kind: 'sets', per: 'total', sets: [{ reps: 10 }] } },
      { ...base, id: 'evt-000004', day: '2026-11-01' },
    ].flatMap((row) => {
      const entry = parseActivity(row)
      return entry === undefined ? [] : [entry]
    })
    expect(tallyActivities(rows, '2026-11-15', '2026-11-21')).toEqual([
      {
        exercise: 'Curls',
        totalReps: 110,
        perSideReps: 40,
        reportedSets: 1,
        minutes: 0,
        entries: 3,
      },
    ])
  })
})
