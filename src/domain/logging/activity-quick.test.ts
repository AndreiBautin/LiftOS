import { describe, expect, it } from 'vitest'

import { parseActivity, quickAmount, recentExercises, type ActivityEntry } from './activity'

function entry(id: string, day: string, exercise: string, at: string): ActivityEntry {
  const parsed = parseActivity({
    id,
    day,
    exercise,
    amount: { kind: 'total', reps: 10, per: 'total' },
    source: 'app',
    createdAt: at,
  })
  if (parsed === undefined) throw new Error('fixture')
  return parsed
}

describe('quickAmount', () => {
  it('files reps alone as a day total, with no set invented', () => {
    expect(quickAmount({ reps: '100', sets: '', load: '', per: 'total' })).toEqual({
      ok: true,
      amount: { kind: 'total', reps: 100, per: 'total' },
      loaded: false,
    })
  })

  it('keeps per side as said and never converts it', () => {
    const result = quickAmount({ reps: '40', sets: '', load: '', per: 'per-side' })
    expect(result.ok && result.amount).toEqual({ kind: 'total', reps: 40, per: 'per-side' })
  })

  it('files sets as that many sets of those reps, with a load only when typed', () => {
    expect(quickAmount({ reps: '12', sets: '3', load: '', per: 'total' })).toEqual({
      ok: true,
      amount: { kind: 'sets', sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }], per: 'total' },
      loaded: false,
    })
    const loaded = quickAmount({ reps: '15', sets: '2', load: '25', per: 'per-side' })
    expect(loaded).toEqual({
      ok: true,
      amount: {
        kind: 'sets',
        sets: [
          { reps: 15, load: 25 },
          { reps: 15, load: 25 },
        ],
        per: 'per-side',
      },
      loaded: true,
    })
  })

  it('refuses a load without a set count rather than inventing one set', () => {
    expect(quickAmount({ reps: '20', sets: '', load: '25', per: 'total' })).toEqual({
      ok: false,
      reason: 'load-needs-sets',
    })
  })

  it('refuses missing or impossible numbers', () => {
    expect(quickAmount({ reps: '', sets: '', load: '', per: 'total' }).ok).toBe(false)
    expect(quickAmount({ reps: '0', sets: '', load: '', per: 'total' }).ok).toBe(false)
    expect(quickAmount({ reps: '10', sets: '0', load: '', per: 'total' }).ok).toBe(false)
    expect(quickAmount({ reps: '10', sets: '2', load: '-5', per: 'total' }).ok).toBe(false)
    expect(quickAmount({ reps: '1.5', sets: '', load: '', per: 'total' }).ok).toBe(false)
  })
})

describe('recentExercises', () => {
  it('offers only names actually logged, newest first, once each', () => {
    const entries = [
      entry('evt-a00001', '2026-11-20', 'Push-ups', '2026-11-20T10:00:00.000Z'),
      entry('evt-a00002', '2026-11-22', 'Curls', '2026-11-22T10:00:00.000Z'),
      entry('evt-a00003', '2026-11-21', 'curls ', '2026-11-21T10:00:00.000Z'),
      entry('evt-a00004', '2026-11-21', 'Lateral raises', '2026-11-21T11:00:00.000Z'),
    ]
    expect(recentExercises(entries, 6)).toEqual(['Curls', 'Lateral raises', 'Push-ups'])
    expect(recentExercises(entries, 1)).toEqual(['Curls'])
  })

  it('offers nothing when nothing is logged', () => {
    expect(recentExercises([], 6)).toEqual([])
  })
})
