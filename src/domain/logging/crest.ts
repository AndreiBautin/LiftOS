import type { ExerciseId } from '@/domain/ids/ids'

import { workingSets, type WorkoutLog } from './workout-log'

export interface CrestSegment {
  readonly exerciseId: ExerciseId
  /** Working sets this exercise contributed. */
  readonly sets: number
  /** Its share of the session's working sets, 0–1. */
  readonly share: number
  /** Whether it set a record this session. */
  readonly record: boolean
}

export interface Crest {
  /** In the order the exercises were done; warm-ups and empty entries left out. */
  readonly segments: readonly CrestSegment[]
  readonly totalSets: number
  /** Degrees the emblem is turned, fixed per session. */
  readonly rotation: number
}

/**
 * A session's emblem, as data: a ring cut into one segment per exercise,
 * each as long as its share of the working sets, a mark for each set, and
 * the records picked out — so no two sessions draw the same crest, and a
 * day of five exercises looks different from a day of two.
 *
 * **Sets, not tonnage**, for the share: by tonnage a deadlift would take
 * most of the ring and the curls after it a sliver, which is a fact about
 * weights rather than about the session. **The rotation is the session's
 * own**, hashed from its id, so a crest is the same every time it is drawn
 * and two sessions with the same exercises still do not sit alike.
 */
export function sessionCrest(log: WorkoutLog, recordIds: ReadonlySet<ExerciseId>): Crest {
  const counted = log.entries
    .map((entry) => ({ exerciseId: entry.exerciseId, sets: workingSets(entry).length }))
    .filter((one) => one.sets > 0)
  const totalSets = counted.reduce((sum, one) => sum + one.sets, 0)
  return {
    segments: counted.map((one) => ({
      exerciseId: one.exerciseId,
      sets: one.sets,
      share: totalSets === 0 ? 0 : one.sets / totalSets,
      record: recordIds.has(one.exerciseId),
    })),
    totalSets,
    rotation: hashDegrees(log.id),
  }
}

/** FNV-1a over the id, folded to 0–359. */
function hashDegrees(id: string): number {
  let hash = 0x811c9dc5
  for (let at = 0; at < id.length; at++) {
    hash ^= id.charCodeAt(at)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % 360
}
