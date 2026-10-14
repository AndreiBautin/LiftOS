import type { CheckIn } from '@/domain/autoregulation/check-in'
import type { ProgramPosition } from '@/domain/programs/position'
import { builtInExercises } from '@/domain/exercises/catalogue'
import type { Exercise } from '@/domain/exercises/exercise'
import { resolveLibrary } from '@/domain/exercises/library'
import type { CheckInId, ExerciseId, WorkoutId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import type {
  CheckInRepository,
  Clock,
  ExerciseRepository,
  PositionRepository,
  TombstoneRepository,
  WorkoutRepository,
} from '@/domain/repositories/ports'
import type { Tombstone, TombstonedCollection } from '@/domain/sync/tombstone'
import { tombstoneKey } from '@/domain/sync/tombstone'

import {
  fromStored,
  toStored,
  workoutSnapshots,
  type AppDatabase,
  type StoredWorkout,
} from './database'

/**
 * IndexedDB implementations of the domain's repository ports.
 *
 * Thin by design: each method is one store or index operation. Anything
 * that needs a decision made about it belongs in a use-case, not here —
 * a repository that starts computing is a repository that cannot be
 * swapped for an in-memory double in a test.
 */

/**
 * Stamping and tombstoning, in one place each.
 *
 * Both are the kind of bookkeeping that is a guarantee when the storage
 * layer does it and a habit when call sites are asked to. There are five
 * paths that write a workout and three that write an exercise; a rule
 * living in any of them is a rule that will be missed by the sixth.
 */
function stamp<T>(record: T, clock: Clock): T & { readonly updatedAt: string } {
  return { ...record, updatedAt: clock.now().toISOString() }
}

async function bury(
  db: AppDatabase,
  clock: Clock,
  collection: TombstonedCollection,
  id: string,
): Promise<void> {
  const tombstone: Tombstone = { id, collection, deletedAt: clock.now().toISOString() }
  await db.put('tombstones', tombstone, tombstoneKey(collection, id))
}

/**
 * What has been deleted. See `domain/sync/tombstone.ts`.
 */
export function createTombstoneRepository(db: AppDatabase): TombstoneRepository {
  return {
    async all() {
      return db.getAll('tombstones')
    },
    async record(tombstones: readonly Tombstone[]) {
      const tx = db.transaction('tombstones', 'readwrite')
      await Promise.all([
        ...tombstones.map((tombstone) =>
          tx.store.put(tombstone, tombstoneKey(tombstone.collection, tombstone.id)),
        ),
        tx.done,
      ])
    },
  }
}

/**
 * The exercise library: the shipped catalogue, plus whatever the store
 * holds that the catalogue cannot know about.
 *
 * The one repository here that is not a straight pass-through, and the
 * exception is deliberate — see {@link resolveLibrary}. Reading the
 * catalogue at every use is what removed three delivery mechanisms that
 * between them still could not deliver an edit to an exercise that
 * already existed.
 */
export function createExerciseRepository(db: AppDatabase): ExerciseRepository {
  return {
    async all() {
      return resolveLibrary(builtInExercises(), await db.getAll('exercises'))
    },
    async restoreMany(exercises: readonly Exercise[]) {
      const tx = db.transaction('exercises', 'readwrite')
      await Promise.all([...exercises.map((exercise) => tx.store.put(exercise)), tx.done])
    },
    async purge(id: ExerciseId) {
      await db.delete('exercises', id)
    },
    async count() {
      return (await this.all()).length
    },
  }
}

/**
 * Where the lifter is, under one fixed key.
 *
 * A single-record store rather than a keyed collection, because there is
 * exactly one position and never a list of them. Modelling it as a
 * collection is what invited a library in the first place.
 */
const POSITION_KEY = 'current'

export function createPositionRepository(db: AppDatabase, clock: Clock): PositionRepository {
  return {
    async get() {
      return db.get('position', POSITION_KEY)
    },
    async save(position: ProgramPosition) {
      await db.put('position', stamp(position, clock), POSITION_KEY)
    },
    async restore(position: ProgramPosition) {
      await db.put('position', position, POSITION_KEY)
    },
  }
}

export function createWorkoutRepository(db: AppDatabase, clock: Clock): WorkoutRepository {
  const newestFirst = (a: WorkoutLog, b: WorkoutLog): number => b.date.localeCompare(a.date)

  /** Oldest first by date, ties by id — the `by-date` index's own order. */
  const snapshot = (): Promise<readonly StoredWorkout[]> => {
    let held = workoutSnapshots.get(db)
    if (held === undefined) {
      held = db.getAllFromIndex('workouts', 'by-date')
      workoutSnapshots.set(db, held)
      // A failed read must not be remembered, or every later one fails too.
      held.catch(() => {
        workoutSnapshots.delete(db)
      })
    }
    return held
  }
  const changed = (): void => {
    workoutSnapshots.delete(db)
  }

  return {
    async byId(id: WorkoutId) {
      const stored = await db.get('workouts', id)
      return stored === undefined ? undefined : fromStored(stored)
    },

    async recent(limit: number) {
      const all = await snapshot()
      return all
        .slice(Math.max(0, all.length - limit))
        .reverse()
        .map(fromStored)
    },

    async forExercise(exerciseId: ExerciseId, limit?: number) {
      const ordered = (await snapshot())
        .filter((one) => one.exerciseIds.includes(exerciseId))
        .map(fromStored)
        .sort(newestFirst)
      return limit === undefined ? ordered : ordered.slice(0, limit)
    },

    async inProgress() {
      const open = (await snapshot()).filter((one) => one.status === 'in-progress')
      const newest = [...open].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
      return newest === undefined ? undefined : fromStored(newest)
    },

    async save(log: WorkoutLog) {
      // The index field is derived here and nowhere else, so it cannot
      // drift from the entries it summarises.
      changed()
      await db.put('workouts', toStored(stamp(log, clock)))
      changed()
    },

    async restoreMany(logs: readonly WorkoutLog[]) {
      changed()
      const tx = db.transaction('workouts', 'readwrite')
      await Promise.all([...logs.map((log) => tx.store.put(toStored(log))), tx.done])
      changed()
    },

    async remove(id: WorkoutId) {
      changed()
      await db.delete('workouts', id)
      changed()
      await bury(db, clock, 'workouts', id)
    },

    async purge(id: WorkoutId) {
      changed()
      await db.delete('workouts', id)
      changed()
    },

    async count() {
      return db.count('workouts')
    },

    async all() {
      return (await db.getAll('workouts')).map(fromStored)
    },
  }
}

export function createCheckInRepository(db: AppDatabase): CheckInRepository {
  return {
    async restoreMany(checkIns: readonly CheckIn[]) {
      const tx = db.transaction('checkIns', 'readwrite')
      await Promise.all([...checkIns.map((checkIn) => tx.store.put(checkIn)), tx.done])
    },
    async purge(id: CheckInId) {
      await db.delete('checkIns', id)
    },
    async all() {
      return db.getAll('checkIns')
    },
  }
}
