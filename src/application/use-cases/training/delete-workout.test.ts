import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId, type WorkoutId } from '@/domain/ids/ids'
import type { LogEntry, LoggedSet, WorkoutLog } from '@/domain/logging/workout-log'
import type { WorkoutRepository } from '@/domain/repositories/ports'

import { indexTombstones, shouldAccept } from '@/domain/sync/tombstone'

import { deleteWorkout, restoreWorkout } from './delete-workout'

/**
 * What is tested is mostly that a delete removes exactly what it was asked
 * to and nothing adjacent — and that the undo puts back the same record,
 * stamped so its tombstone no longer covers it.
 */

function set(outcome: LoggedSet['outcome']): LoggedSet {
  return {
    prescription: { load: { kind: 'open' }, reps: { kind: 'fixed', reps: 5 } },
    outcome,
    isWarmup: false,
    ...(outcome === 'completed' ? { actualLoad: 135, actualReps: 5 } : {}),
  }
}

function entry(sets: readonly LoggedSet[]): LogEntry {
  return { exerciseId: asExerciseId('bench-press'), role: 'strength', order: 0, sets }
}

function log(id: string, entries: readonly LogEntry[] = []): WorkoutLog {
  return {
    id: asWorkoutId(id),
    date: '2026-08-25',
    title: 'Tuesday',
    status: 'completed',
    startedAt: '2026-08-25T09:00:00.000Z',
    entries,
  }
}

function repository(seed: readonly WorkoutLog[]) {
  const store = new Map(seed.map((one) => [one.id as string, one]))

  return {
    store,
    workouts: {
      byId: (id: WorkoutId) => Promise.resolve(store.get(id as string)),
      remove: (id: WorkoutId) => {
        store.delete(id)
        return Promise.resolve()
      },
      // Stamps as the real repository does, a moment after any deletion.
      save: (one: WorkoutLog) => {
        store.set(one.id, { ...one, updatedAt: '2026-08-25T10:00:05.000Z' })
        return Promise.resolve()
      },
    } as unknown as WorkoutRepository,
  }
}

describe('deleting a workout', () => {
  it('removes the record it was given and leaves the rest', async () => {
    const { store, workouts } = repository([log('a'), log('b'), log('c')])

    const result = await deleteWorkout(asWorkoutId('b'), { workouts })

    expect(result.kind).toBe('deleted')
    expect([...store.keys()]).toEqual(['a', 'c'])
  })

  it('reports nothing lost when every set was still pending', async () => {
    // The mis-tapped finish this was built for: filed as completed with
    // nothing performed. The confirmation leans on this number to tell
    // that case apart from a real session.
    const { workouts } = repository([log('a', [entry([set('pending'), set('pending')])])])

    expect(await deleteWorkout(asWorkoutId('a'), { workouts })).toMatchObject({
      kind: 'deleted',
      workingSets: 0,
    })
  })

  it('reports the working sets that go with a real session', async () => {
    const { workouts } = repository([
      log('a', [entry([set('completed'), set('completed'), set('pending')])]),
    ])

    expect(await deleteWorkout(asWorkoutId('a'), { workouts })).toMatchObject({
      kind: 'deleted',
      workingSets: 2,
    })
  })

  it('says so rather than throwing when the record is already gone', async () => {
    const { workouts } = repository([])

    expect(await deleteWorkout(asWorkoutId('missing'), { workouts })).toEqual({
      kind: 'not-found',
    })
  })

  /* An old backup imported later must not take the restored session away again. */
  it('undoes a delete with the same record, newer than its tombstone', async () => {
    const { store, workouts } = repository([log('a', [entry([set('completed')])])])
    const deleted = await deleteWorkout(asWorkoutId('a'), { workouts })
    if (deleted.kind !== 'deleted') throw new Error('not deleted')

    expect(await restoreWorkout(deleted.workout, { workouts })).toBe('restored')
    const back = store.get('a')
    expect(back?.entries).toEqual(deleted.workout.entries)
    const tombstones = indexTombstones([
      { collection: 'workouts', id: 'a', deletedAt: '2026-08-25T10:00:00.000Z' },
    ])
    expect(back !== undefined && shouldAccept(back, 'workouts', 'a', tombstones)).toBe(true)
    expect(await restoreWorkout(deleted.workout, { workouts })).toBe('already-here')
  })
})
