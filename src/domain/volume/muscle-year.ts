import type { Exercise } from '@/domain/exercises/exercise'
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'
import { loggedVolume, type WorkoutLog } from '@/domain/logging/workout-log'
import { mondayOf, shiftDay } from '@/domain/time/day'

/**
 * Every muscle across a year, a row each and a cell a calendar week.
 *
 * **Counted by `loggedVolume`**, the rule the radar, the body map and the
 * muscle page count by, so a cell here and that muscle's page cannot
 * disagree about a week they both show. Weeks run Monday to Sunday from
 * the week holding January 1st — which may begin in December — to the
 * week holding today or December 31st, whichever comes first: a year
 * still running is drawn as far as it has gone, not as a grid of weeks
 * that have not happened.
 *
 * A muscle never trained in the year is left out of the rows and counted,
 * because a row of empty cells says less than "and 3 others not trained".
 */
export interface MuscleYearRow {
  readonly muscle: MuscleGroup
  /** Working sets per week, in the order of `weeks`. */
  readonly sets: readonly number[]
  readonly total: number
}

export interface MuscleYear {
  /** The Monday of every week drawn, oldest first. */
  readonly weeks: readonly string[]
  readonly rows: readonly MuscleYearRow[]
  readonly untrained: readonly MuscleGroup[]
  /** The most sets any one muscle had in any one week; the colour scale's top. */
  readonly peak: number
}

export function muscleYear(
  logs: readonly WorkoutLog[],
  lookup: (id: ExerciseId) => Exercise | undefined,
  year: string,
  today: string,
): MuscleYear {
  const first = mondayOf(`${year}-01-01`)
  const end = `${year}-12-31` < today ? `${year}-12-31` : today
  const weeks: string[] = []
  for (let monday = first; monday <= end; monday = shiftDay(monday, 7)) weeks.push(monday)

  const grid = new Map<MuscleGroup, number[]>()
  for (const log of logs) {
    if (log.status !== 'completed' || log.date < first || log.date > end) continue
    const at = weeks.indexOf(mondayOf(log.date))
    if (at === -1) continue
    const volume = loggedVolume(log, lookup)
    for (const muscle of MUSCLE_GROUPS) {
      const sets = volume[muscle]
      if (sets <= 0) continue
      const row = grid.get(muscle) ?? Array<number>(weeks.length).fill(0)
      row[at] = (row[at] ?? 0) + sets
      grid.set(muscle, row)
    }
  }

  const rows = MUSCLE_GROUPS.flatMap((muscle): MuscleYearRow[] => {
    const sets = grid.get(muscle)
    if (sets === undefined) return []
    return [{ muscle, sets, total: sets.reduce((sum, one) => sum + one, 0) }]
  })
  return {
    weeks,
    rows,
    untrained: MUSCLE_GROUPS.filter((muscle) => !grid.has(muscle)),
    peak: Math.max(0, ...rows.flatMap((row) => row.sets)),
  }
}
