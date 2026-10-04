import { describe, expect, it } from 'vitest'

import type { Exercise } from '@/domain/exercises/exercise'
import { asExerciseId, type ExerciseId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { MUSCLE_WEEKS, muscleHistory } from './muscle-history'

function exercise(slug: string, overrides: Partial<Exercise>): Exercise {
  return {
    id: asExerciseId(slug),
    name: slug,
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    equipment: 'barbell',
    pattern: 'isolation',
    isCompound: false,
    isUnilateral: false,
    isCompetition: false,
    loadBasis: 'estimated-1rm',
    intent: 'hypertrophy',
    sfr: 4,
    isBuiltIn: true,
    isArchived: false,
    ...overrides,
  }
}

const LIBRARY = [
  exercise('dips', { primaryMuscle: 'chest' }),
  exercise('fly', { primaryMuscle: 'chest' }),
  exercise('curl', { primaryMuscle: 'biceps', secondaryMuscles: ['forearms'] }),
]
const lookup = (id: ExerciseId) => LIBRARY.find((one) => one.id === id)
const TODAY = '2026-10-07' // a Wednesday

const session = (date: string, work: Record<string, number>) =>
  aWorkout({
    date,
    entries: Object.entries(work).map(([slug, sets]) =>
      anEntry({
        exerciseId: asExerciseId(slug),
        sets: Array.from({ length: sets }, () => aSet({ actualLoad: 50, actualReps: 10 })),
      }),
    ),
  })

describe('one muscle over twelve weeks', () => {
  const history = muscleHistory(
    [
      session('2026-10-05', { dips: 3, curl: 3 }),
      session('2026-09-30', { fly: 2 }),
      session('2026-01-05', { dips: 4 }),
    ],
    lookup,
    'chest',
    TODAY,
  )

  it('counts sets by calendar week, this week last', () => {
    expect(history.weeks).toHaveLength(MUSCLE_WEEKS)
    expect(history.weeks.at(-1)).toBe(3)
    expect(history.weeks.at(-2)).toBe(2)
    expect(history.sets).toBe(5)
  })

  it('names the exercises that paid it, most sets first', () => {
    expect(history.exercises.map((one) => [one.exerciseId, one.sets, one.sessions])).toEqual([
      ['dips', 3, 1],
      ['fly', 2, 1],
    ])
  })

  /* The curl's three sets are biceps, and its forearm involvement is no set at all. */
  it('takes its share of every muscle across the same weeks', () => {
    expect(history.share).toBeCloseTo(5 / 8)
    expect(
      muscleHistory([session('2026-10-05', { curl: 3 })], lookup, 'forearms', TODAY).sets,
    ).toBe(0)
  })

  it('remembers the last day even outside the window', () => {
    expect(history.lastDay).toBe('2026-10-05')
    const old = muscleHistory([session('2026-01-05', { dips: 4 })], lookup, 'chest', TODAY)
    expect(old).toMatchObject({ lastDay: '2026-01-05', sets: 0, share: 0 })
  })
})
