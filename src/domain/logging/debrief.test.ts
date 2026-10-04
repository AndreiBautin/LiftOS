import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { SetPrescription } from '@/domain/programs/prescription'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { debrief } from './debrief'
import type { LoggedSet, WorkoutLog } from './workout-log'

const bench = asExerciseId('bench-press')
const row = asExerciseId('pendlay-row')
const curl = asExerciseId('dumbbell-curl')

const RANGE: SetPrescription = {
  load: { kind: 'working' },
  reps: { kind: 'range', low: 3, high: 5 },
}
const set = (load: number, reps: number, plannedReps = reps): LoggedSet =>
  aSet({ prescription: RANGE, actualLoad: load, actualReps: reps, plannedReps })
const sets = (load: number, ...reps: number[]) => reps.map((one) => set(load, one))

const done = (id: string, at: string, entries: WorkoutLog['entries']) =>
  aWorkout({
    id: asWorkoutId(id),
    startedAt: at,
    date: at.slice(0, 10),
    status: 'completed',
    entries,
  })

const last = done('a', '2026-09-01T18:00:00', [
  anEntry({ exerciseId: bench, sets: sets(205, 5, 5, 4) }),
  anEntry({ exerciseId: row, sets: sets(185, 5, 5, 5) }),
  anEntry({ exerciseId: curl, sets: sets(35, 5, 5, 5) }),
])

describe('the debrief under a session', () => {
  const today = done('b', '2026-09-08T18:00:00', [
    // Same bar, more reps on the top set, every set at the top: up next time.
    anEntry({ exerciseId: bench, sets: sets(205, 5, 5, 5) }),
    // Ten heavier: moved, and leads the line.
    anEntry({ exerciseId: row, sets: sets(195, 4, 4, 4) }),
    // Same bar, a set short of its plan: held, and the bar stays.
    anEntry({
      exerciseId: curl,
      sets: [set(35, 5), set(35, 5), set(35, 3, 5)],
    }),
  ])
  const result = debrief(today, [last, today])

  it('names what moved, heaviest change first', () => {
    expect(result.moved.map((one) => one.exerciseId)).toEqual([row])
    expect(result.moved[0]?.versus).toEqual({ kind: 'heavier', by: 10 })
  })

  it('names what held, by the same rule as the set rows', () => {
    // Bench's top set is 205 × 5 both times: matched, not moved.
    expect(result.held.map((one) => one.exerciseId)).toEqual([bench, curl])
  })

  it('says what next time holds, the bar going up first', () => {
    expect(result.next).toEqual([
      { exerciseId: bench, kind: 'up', load: 205 },
      { exerciseId: curl, kind: 'repeat', load: 35 },
      // Row: four reps of a 3–5 range, on plan — the same bar, a rep more.
      { exerciseId: row, kind: 'build', load: 195 },
    ])
  })

  it('leaves a first session out of moved and held', () => {
    const first = done('c', '2026-09-08T18:00:00', [
      anEntry({ exerciseId: bench, sets: sets(205, 5, 5, 5) }),
    ])
    const alone = debrief(first, [first])
    expect(alone.moved).toEqual([])
    expect(alone.held).toEqual([])
    expect(alone.next).toEqual([{ exerciseId: bench, kind: 'up', load: 205 }])
  })
})
