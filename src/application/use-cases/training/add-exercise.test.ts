import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import type { ExerciseRepository, WorkoutRepository } from '@/domain/repositories/ports'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { addExercise } from './add-exercise'

const ROW = asExerciseId('barbell-row')
const CURL = asExerciseId('db-curl')

function harness(open: WorkoutLog, ...history: readonly WorkoutLog[]) {
  let saved = open
  const workouts = {
    byId: () => Promise.resolve(saved),
    forExercise: (id: string) =>
      Promise.resolve(
        [saved, ...history].filter((log) => log.entries.some((entry) => entry.exerciseId === id)),
      ),
    save: (log: WorkoutLog) => {
      saved = log
      return Promise.resolve()
    },
  } as unknown as WorkoutRepository
  const exercises = {
    all: () => Promise.resolve(builtInExercises()),
  } as unknown as ExerciseRepository
  return { deps: { workouts, exercises }, saved: () => saved }
}

const open = () =>
  aWorkout({
    id: asWorkoutId('today'),
    status: 'in-progress',
    entries: [
      anEntry({ exerciseId: ROW, order: 0 }),
      anEntry({ exerciseId: asExerciseId('pull-up'), order: 1 }),
    ],
  })

describe('adding an exercise to the open session', () => {
  it('goes after the exercise on screen, in straight sets of its range', async () => {
    const { deps } = harness(open())
    const updated = await addExercise(
      { workoutId: asWorkoutId('today'), afterIndex: 0, exerciseId: CURL },
      deps,
    )
    const added = updated.entries[1]
    expect(updated.entries.map((entry) => entry.exerciseId)).toEqual([ROW, CURL, 'pull-up'])
    expect(added?.sets).toHaveLength(4)
    expect(added?.sets[0]?.prescription.reps).toEqual({ kind: 'range', low: 15, high: 30 })
    expect(added?.slotId).toBeUndefined()
    // No history: no weight is guessed.
    expect(added?.sets[0]?.plannedLoad).toBeUndefined()
  })

  it('plans the load from its own last time', async () => {
    const lastWeek = aWorkout({
      id: asWorkoutId('last-week'),
      entries: [
        anEntry({
          exerciseId: CURL,
          sets: [1, 2, 3, 4].map(() => aSet({ actualLoad: 30, actualReps: 18 })),
        }),
      ],
    })
    const { deps } = harness(open(), lastWeek)
    const updated = await addExercise(
      { workoutId: asWorkoutId('today'), afterIndex: 1, exerciseId: CURL },
      deps,
    )
    expect(updated.entries.at(-1)?.sets[0]).toMatchObject({ plannedLoad: 30, plannedReps: 19 })
  })

  it('refuses a session that is not open', async () => {
    const { deps } = harness({ ...open(), status: 'completed' })
    await expect(
      addExercise({ workoutId: asWorkoutId('today'), afterIndex: 0, exerciseId: CURL }, deps),
    ).rejects.toThrow('No open session')
  })
})
