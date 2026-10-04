import type { ExerciseId } from '@/domain/ids/ids'
import { shiftDay } from '@/domain/time/day'

import { topSet, type Performance } from './versus-last'
import { workingSets, type WorkoutLog } from './workout-log'

/**
 * Each lift as it was in its first four weeks against its last four.
 *
 * **Its own first month**, not the app's: an exercise added in August is
 * compared with August, so a new lift is not read against a time before
 * it existed. **Four weeks each side**, so both halves hold the same
 * number of training weeks and "sessions a week" means the same thing.
 * The two windows must not overlap — a lift begun six weeks ago has no
 * "then" distinct from its "now", and is left out rather than compared
 * with itself.
 *
 * Finished sessions only, working sets only. The top set is `topSet`'s —
 * heaviest bar, then most reps at it — the rule every other screen uses.
 */
export interface Window {
  readonly from: string
  readonly to: string
  readonly top: Performance
  readonly sessionsPerWeek: number
  /** Load × reps per week, working sets. */
  readonly volumePerWeek: number
}

export interface ThenNow {
  readonly exerciseId: ExerciseId
  readonly then: Window
  readonly now: Window
}

const DAYS = 28
const WEEKS = DAYS / 7

function windowOf(
  logs: readonly WorkoutLog[],
  exerciseId: ExerciseId,
  from: string,
  to: string,
): Window | undefined {
  const sets = logs
    .filter((log) => log.date >= from && log.date <= to)
    .map((log) =>
      log.entries
        .filter((entry) => entry.exerciseId === exerciseId)
        .flatMap((entry) => workingSets(entry)),
    )
    .filter((done) => done.length > 0)
  const top = topSet(sets.flat().map((set) => ({ load: set.actualLoad, reps: set.actualReps })))
  if (top === undefined) return undefined
  const volume = sets
    .flat()
    .reduce((sum, set) => sum + (set.actualLoad ?? 0) * (set.actualReps ?? 0), 0)
  return {
    from,
    to,
    top,
    sessionsPerWeek: sets.length / WEEKS,
    volumePerWeek: volume / WEEKS,
  }
}

export function thenAndNow(logs: readonly WorkoutLog[], today: string): readonly ThenNow[] {
  const done = logs.filter((log) => log.status === 'completed' && log.date <= today)
  const firsts = new Map<ExerciseId, string>()
  for (const log of done.toSorted((a, b) => a.date.localeCompare(b.date))) {
    for (const entry of log.entries) {
      if (!firsts.has(entry.exerciseId) && workingSets(entry).length > 0)
        firsts.set(entry.exerciseId, log.date)
    }
  }
  const nowFrom = shiftDay(today, -(DAYS - 1))
  return [...firsts].flatMap(([exerciseId, first]) => {
    const thenTo = shiftDay(first, DAYS - 1)
    if (thenTo >= nowFrom) return []
    const then = windowOf(done, exerciseId, first, thenTo)
    const now = windowOf(done, exerciseId, nowFrom, today)
    return then === undefined || now === undefined ? [] : [{ exerciseId, then, now }]
  })
}
