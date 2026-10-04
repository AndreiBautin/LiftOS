import { mondayOf, shiftDay } from '@/domain/time/day'

import { totalWorkingSets, type WorkoutLog } from './workout-log'

export interface YearInSquares {
  readonly year: string
  /** Working sets per trained day key. */
  readonly days: Readonly<Record<string, number>>
  readonly sessions: number
  readonly daysTrained: number
  /** Calendar weeks with a finished session. */
  readonly weeksTrained: number
  /** The longest run of consecutive trained weeks this year. */
  readonly bestStreak: number
  /** The run reaching this week; this week does not break it until it is over. */
  readonly currentStreak: number
  readonly months: readonly {
    readonly month: string
    readonly sessions: number
    readonly sets: number
  }[]
}

/**
 * A calendar year as days lit by work, with the streaks a year holds.
 *
 * **Streaks are counted in weeks**, as the hero's week streak is: a week
 * with a finished session continues it, and **the week still running does
 * not break it** — on a Monday morning the run is not over because the
 * week has not had its session yet. Finished sessions only, and the
 * counting is the week card's `totalWorkingSets`.
 */
export function yearInSquares(
  logs: readonly WorkoutLog[],
  year: string,
  today: string,
): YearInSquares {
  const inYear = logs.filter(
    (log) => log.status === 'completed' && log.date.startsWith(year) && log.date <= today,
  )
  const days: Record<string, number> = {}
  for (const log of inYear) days[log.date] = (days[log.date] ?? 0) + totalWorkingSets(log)

  const trainedWeeks = new Set(inYear.map((log) => mondayOf(log.date)))
  const first = mondayOf(`${year}-01-01`)
  const end = today.startsWith(year) ? today : `${year}-12-31`
  const thisWeek = mondayOf(end)

  let best = 0
  let run = 0
  for (let monday = first; monday <= thisWeek; monday = shiftDay(monday, 7)) {
    if (trainedWeeks.has(monday)) {
      run += 1
      best = Math.max(best, run)
    } else if (monday !== thisWeek || !today.startsWith(year)) {
      run = 0
    }
  }

  const months = Array.from({ length: 12 }, (_, at) => {
    const month = `${year}-${String(at + 1).padStart(2, '0')}`
    const these = inYear.filter((log) => log.date.startsWith(month))
    return {
      month,
      sessions: these.length,
      sets: these.reduce((sum, log) => sum + totalWorkingSets(log), 0),
    }
  })

  return {
    year,
    days,
    sessions: inYear.length,
    daysTrained: Object.keys(days).length,
    weeksTrained: trainedWeeks.size,
    bestStreak: best,
    currentStreak: run,
    months,
  }
}
