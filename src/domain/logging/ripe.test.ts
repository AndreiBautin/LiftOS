import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { bestsByExercise } from './bests'
import { ripeLifts } from './ripe'
import type { WorkoutLog } from './workout-log'

const bench = asExerciseId('bench-press')
const row = asExerciseId('pendlay-row')
const curl = asExerciseId('dumbbell-curl')

const done = (id: string, at: string, entries: WorkoutLog['entries']) =>
  aWorkout({
    id: asWorkoutId(id),
    startedAt: at,
    date: at.slice(0, 10),
    status: 'completed',
    entries,
  })

const history = [
  done('a', '2026-09-01T18:00:00', [
    anEntry({ exerciseId: bench, sets: [aSet({ actualLoad: 205, actualReps: 5 })] }),
    anEntry({ exerciseId: row, sets: [aSet({ actualLoad: 185, actualReps: 5 })] }),
    anEntry({ exerciseId: curl, sets: [aSet({ actualLoad: 35, actualReps: 15 })] }),
  ]),
  done('b', '2026-09-08T18:00:00', [
    anEntry({ exerciseId: bench, sets: [aSet({ actualLoad: 200, actualReps: 5 })] }),
    anEntry({ exerciseId: row, sets: [aSet({ actualLoad: 185, actualReps: 5 })] }),
    anEntry({ exerciseId: curl, sets: [aSet({ actualLoad: 35, actualReps: 15 })] }),
  ]),
]

const preview = aWorkout({
  id: asWorkoutId('next'),
  startedAt: '2026-09-15T18:00:00',
  status: 'in-progress',
  entries: [
    // Up from last time's 200, and past the best of 205.
    anEntry({
      exerciseId: bench,
      sets: [aSet({ outcome: 'pending', plannedLoad: 210, plannedReps: 3 })],
    }),
    // Same bar, one rep past the best at it: the plan's ordinary step.
    anEntry({
      exerciseId: row,
      sets: [aSet({ outcome: 'pending', plannedLoad: 185, plannedReps: 6 })],
    }),
    // Same bar, same reps: nothing to name.
    anEntry({
      exerciseId: curl,
      sets: [aSet({ outcome: 'pending', plannedLoad: 35, plannedReps: 15 })],
    }),
  ],
})

describe('what the next session is ripe for', () => {
  const ripe = ripeLifts(preview, history, bestsByExercise(history))

  it('names a load up from last time, and a heaviest-ever bar', () => {
    expect(ripe[0]).toMatchObject({ exerciseId: bench, load: 210, from: 200, heaviest: true })
  })

  /* The plan aims a rep past last time, so at the top bar that is every session. */
  it('does not count a planned rep record as news', () => {
    expect(ripe.map((one) => one.exerciseId)).not.toContain(row)
  })

  it('leaves out a lift with nothing new on the bar', () => {
    expect(ripe.map((one) => one.exerciseId)).not.toContain(curl)
  })
})
