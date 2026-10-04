import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import { asExerciseId, asWorkoutId, type ExerciseId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { muscleYear } from './muscle-year'

const library = builtInExercises()
const lookup = (id: ExerciseId) => library.find((one) => one.id === id)
const curl = asExerciseId('db-curl')

const session = (
  id: string,
  date: string,
  sets: number,
  status: WorkoutLog['status'] = 'completed',
) =>
  aWorkout({
    id: asWorkoutId(id),
    date,
    status,
    entries: [
      anEntry({
        exerciseId: curl,
        role: 'hypertrophy',
        sets: Array.from({ length: sets }, () => aSet()),
      }),
    ],
  })

describe('every muscle across a year', () => {
  const logs = [
    session('a', '2026-01-02', 3), // the week of Monday Dec 29th
    session('b', '2026-01-08', 2),
    session('c', '2026-01-09', 4), // same week as b
    session('d', '2025-12-20', 9), // the year before
    session('e', '2026-01-10', 7, 'in-progress'),
  ]
  const year = muscleYear(logs, lookup, '2026', '2026-01-14')

  it('runs from the week holding January 1st to the week holding today', () => {
    expect(year.weeks).toEqual(['2025-12-29', '2026-01-05', '2026-01-12'])
  })

  it('counts each week by loggedVolume, finished sessions in the year only', () => {
    const biceps = year.rows.find((row) => row.muscle === 'biceps')
    expect(biceps?.sets).toEqual([3, 6, 0])
    expect(biceps?.total).toBe(9)
    expect(year.peak).toBe(6)
  })

  it('leaves untrained muscles out of the rows and names them', () => {
    expect(year.rows.map((row) => row.muscle)).toEqual(['biceps'])
    expect(year.untrained).toContain('quads')
    expect(year.untrained).not.toContain('biceps')
  })

  it('stops at December 31st for a year that is over', () => {
    expect(muscleYear([], lookup, '2025', '2026-03-01').weeks.at(-1)).toBe('2025-12-29')
  })
})
