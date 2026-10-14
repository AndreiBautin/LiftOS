import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import type { WorkoutRepository } from '@/domain/repositories/ports'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { reorderSession } from './reorder-session'
import { pairSuperset, unpairSuperset } from './superset'

/** One stored workout; counts the writes so a no-op can be held to none. */
function harness(stored: WorkoutLog) {
  let saved = stored
  let writes = 0
  const workouts = {
    byId: () => Promise.resolve(saved),
    save: (log: WorkoutLog) => {
      saved = log
      writes += 1
      return Promise.resolve()
    },
  } as unknown as WorkoutRepository
  return { deps: { workouts }, saved: () => saved, writes: () => writes }
}

const id = asWorkoutId('today')
const names = (log: WorkoutLog) => log.entries.map((entry) => entry.exerciseId)
// Pairing only applies to work still to do.
const pending = [aSet({ outcome: 'pending' })]
const session = (status: WorkoutLog['status'] = 'in-progress') =>
  aWorkout({
    id,
    status,
    entries: [
      anEntry({
        exerciseId: asExerciseId('lateral-raise'),
        role: 'hypertrophy',
        order: 0,
        sets: pending,
      }),
      anEntry({ exerciseId: asExerciseId('db-curl'), role: 'assistance', order: 1, sets: pending }),
      anEntry({
        exerciseId: asExerciseId('skullcrusher'),
        role: 'assistance',
        order: 2,
        sets: pending,
      }),
    ],
  })

/*
 * The domain rules are tested beside them (`reorder.ts`, `superset.ts`).
 * What these hold is the use cases' own part: the change is saved, a
 * finished session is never edited, and a change to nothing writes
 * nothing.
 */
describe('reordering an open session', () => {
  it('saves the new order and returns it', async () => {
    const h = harness(session())
    const moved = await reorderSession({ workoutId: id, at: 2, by: -1 }, h.deps)
    expect(names(h.saved())).toEqual(['lateral-raise', 'skullcrusher', 'db-curl'])
    expect(moved).toBe(h.saved())
  })

  it('refuses a move the rules do not allow, writing nothing', async () => {
    const h = harness(session())
    await expect(reorderSession({ workoutId: id, at: 0, by: -1 }, h.deps)).rejects.toThrow()
    expect(h.writes()).toBe(0)
  })

  it('never edits a finished session', async () => {
    const h = harness(session('completed'))
    await expect(reorderSession({ workoutId: id, at: 1, by: 1 }, h.deps)).rejects.toThrow(
      'No open session',
    )
    expect(h.writes()).toBe(0)
  })
})

describe('pairing a superset', () => {
  it('pairs an exercise with the next, saved on the log, and unpairs it', async () => {
    const h = harness(session())
    await pairSuperset(id, 1, h.deps)
    const group = h.saved().entries[1]?.superset
    expect(group).toBeDefined()
    expect(h.saved().entries[2]?.superset).toBe(group)

    await unpairSuperset(id, 2, h.deps)
    expect(h.saved().entries.every((entry) => entry.superset === undefined)).toBe(true)
  })

  it('writes nothing when unpairing an exercise that is not paired', async () => {
    const h = harness(session())
    await unpairSuperset(id, 0, h.deps)
    expect(h.writes()).toBe(0)
  })

  it('never edits a finished session', async () => {
    const h = harness(session('completed'))
    await expect(pairSuperset(id, 1, h.deps)).rejects.toThrow('No open session')
    expect(h.writes()).toBe(0)
  })
})
