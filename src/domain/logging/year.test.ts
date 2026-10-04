import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { yearInSquares } from './year'

const session = (date: string, sets = 3) =>
  aWorkout({
    id: asWorkoutId(date),
    date,
    entries: [
      anEntry({
        exerciseId: asExerciseId('bench-press'),
        sets: Array.from({ length: sets }, () => aSet({ actualLoad: 100, actualReps: 5 })),
      }),
    ],
  })

describe('a year in squares', () => {
  /* Mondays: Sep 7, 14, 21 trained; 28 skipped; Oct 5 trained. Today is Wed Oct 7. */
  const logs = [
    session('2025-12-31'),
    session('2026-09-07'),
    session('2026-09-09', 4),
    session('2026-09-15'),
    session('2026-09-21'),
    session('2026-10-05'),
  ]
  const year = yearInSquares(logs, '2026', '2026-10-07')

  it('lights each trained day by its working sets, this year only', () => {
    expect(year.days['2026-09-09']).toBe(4)
    expect(year.days['2025-12-31']).toBeUndefined()
    expect(year).toMatchObject({ sessions: 5, daysTrained: 5, weeksTrained: 4 })
  })

  it('counts streaks in weeks, broken by a week with nothing', () => {
    expect(year.bestStreak).toBe(3)
    expect(year.currentStreak).toBe(1)
  })

  /* On a Monday morning the run is not over because the week has not had its session yet. */
  it('does not break the current run on the week still running', () => {
    const early = yearInSquares(logs.slice(0, 5), '2026', '2026-09-28')
    expect(early.currentStreak).toBe(3)
  })

  it('totals each month', () => {
    expect(year.months[8]).toEqual({ month: '2026-09', sessions: 4, sets: 13 })
    expect(year.months[0]).toEqual({ month: '2026-01', sessions: 0, sets: 0 })
  })
})
