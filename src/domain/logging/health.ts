import type { ExerciseId, WorkoutId } from '@/domain/ids/ids'

import { workingSets, type WorkoutLog } from './workout-log'

/**
 * What the history holds, and anything in it that looks wrong.
 *
 * **It reports and offers; it does not repair on its own.** Every finding
 * names the sessions it is about, and the fix for each is an operation the
 * app already has — abandon for a session left open, delete for a copy or
 * an empty record — so a repair here is exactly what the same press would
 * do elsewhere, tombstone and all. An exercise nothing in the library
 * knows has no fix: the sets are real, and the exercise may come back with
 * a later build.
 */
export interface HealthCounts {
  readonly sessions: number
  readonly abandoned: number
  readonly sets: number
  readonly first?: string
  readonly last?: string
}

export type Finding =
  /** An open session started more than a day ago, or a second one open. */
  | { readonly kind: 'left-open'; readonly workoutIds: readonly WorkoutId[] }
  /** Finished sessions sharing a start time with an earlier one: copies. */
  | { readonly kind: 'duplicate'; readonly workoutIds: readonly WorkoutId[] }
  /** Finished sessions with not one set done. */
  | { readonly kind: 'empty'; readonly workoutIds: readonly WorkoutId[] }
  /** Sets filed under exercises the library does not hold. */
  | { readonly kind: 'unknown-exercise'; readonly exerciseIds: readonly ExerciseId[] }

export interface DataHealth {
  readonly counts: HealthCounts
  readonly findings: readonly Finding[]
}

const DAY_MS = 86_400_000

export function dataHealth(
  logs: readonly WorkoutLog[],
  known: ReadonlySet<string>,
  now: Date,
): DataHealth {
  const finished = logs.filter((log) => log.status === 'completed')
  const dates = finished.map((log) => log.date).toSorted()
  const first = dates[0]
  const last = dates.at(-1)
  const counts: HealthCounts = {
    sessions: finished.length,
    abandoned: logs.filter((log) => log.status === 'abandoned').length,
    sets: finished.reduce((sum, log) => sum + log.entries.flatMap(workingSets).length, 0),
    ...(first === undefined ? {} : { first }),
    ...(last === undefined ? {} : { last }),
  }

  const findings: Finding[] = []

  // The newest open session is the one in use, unless it too is stale.
  const open = logs
    .filter((log) => log.status === 'in-progress')
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))
  const leftOpen = open.filter(
    (log, at) => at > 0 || now.getTime() - Date.parse(log.startedAt) > DAY_MS,
  )
  if (leftOpen.length > 0)
    findings.push({ kind: 'left-open', workoutIds: leftOpen.map((log) => log.id) })

  // A copy is a later record with the start time and title of an earlier one.
  const seen = new Set<string>()
  const copies: WorkoutId[] = []
  for (const log of finished.toSorted((a, b) => a.id.localeCompare(b.id))) {
    const key = `${log.startedAt}|${log.title}`
    if (seen.has(key)) copies.push(log.id)
    else seen.add(key)
  }
  if (copies.length > 0) findings.push({ kind: 'duplicate', workoutIds: copies })

  const empty = finished.filter((log) =>
    log.entries.every((entry) => entry.sets.every((set) => set.outcome !== 'completed')),
  )
  if (empty.length > 0) findings.push({ kind: 'empty', workoutIds: empty.map((log) => log.id) })

  const unknown = [
    ...new Set(
      logs.flatMap((log) =>
        log.entries
          .filter((entry) => !known.has(entry.exerciseId))
          .map((entry) => entry.exerciseId),
      ),
    ),
  ]
  if (unknown.length > 0) findings.push({ kind: 'unknown-exercise', exerciseIds: unknown })

  return { counts, findings }
}
