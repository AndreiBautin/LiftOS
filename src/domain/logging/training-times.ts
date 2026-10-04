import { sessionRecords } from './records'
import type { WorkoutLog } from './workout-log'

/** Parts of the day a session can start in, by local hour. */
export const DAY_PARTS = [
  { key: 'early', label: 'Early', from: 0, to: 9 },
  { key: 'morning', label: 'Morning', from: 9, to: 12 },
  { key: 'midday', label: 'Midday', from: 12, to: 15 },
  { key: 'afternoon', label: 'Afternoon', from: 15, to: 18 },
  { key: 'evening', label: 'Evening', from: 18, to: 21 },
  { key: 'night', label: 'Night', from: 21, to: 24 },
] as const

export type DayPart = (typeof DAY_PARTS)[number]['key']

export interface TrainingTimes {
  /** Sessions started, by weekday (Monday first) then part of day. */
  readonly grid: readonly (readonly number[])[]
  readonly sessions: number
  /** Records set, by part of day — where the good days land. */
  readonly records: Readonly<Record<DayPart, number>>
}

/**
 * When the training happens: finished sessions counted by the weekday
 * and part of the day they started in, and the records by part of day.
 *
 * **Descriptive and nothing more.** That most records come in the evening
 * says most sessions do; this does not claim the evening makes anybody
 * stronger, which is why the records sit beside the counts rather than
 * being divided by them into a rate that reads as advice. Read in local
 * time from `startedAt`, so a session is at the hour the lifter lived it.
 */
export function trainingTimes(logs: readonly WorkoutLog[]): TrainingTimes {
  const grid = Array.from({ length: 7 }, () => Array<number>(DAY_PARTS.length).fill(0))
  const records = Object.fromEntries(DAY_PARTS.map((part) => [part.key, 0])) as Record<
    DayPart,
    number
  >
  const finished = logs.filter((log) => log.status === 'completed')
  const recordsBy = sessionRecords(finished)
  let sessions = 0

  for (const log of finished) {
    const started = new Date(log.startedAt)
    if (Number.isNaN(started.getTime())) continue
    const weekday = (started.getDay() + 6) % 7
    const part = DAY_PARTS.findIndex(
      (one) => started.getHours() >= one.from && started.getHours() < one.to,
    )
    const row = grid[weekday]
    if (row === undefined || part === -1) continue
    row[part] = (row[part] ?? 0) + 1
    sessions += 1
    const key = DAY_PARTS[part]?.key
    if (key !== undefined) records[key] += recordsBy.get(log.id)?.length ?? 0
  }

  return { grid, sessions, records }
}
