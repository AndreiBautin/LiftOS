import type { WorkoutId } from '@/domain/ids/ids'

import { sessionRecords, type SessionRecord } from './records'
import type { WorkoutLog } from './workout-log'

export interface TimelineRecord extends SessionRecord {
  readonly date: string
  readonly workoutId: WorkoutId
  readonly title: string
}

export interface RecordMonth {
  /** `YYYY-MM`. */
  readonly month: string
  /** Newest first. */
  readonly records: readonly TimelineRecord[]
}

/**
 * Every record ever set, in the order it was set, newest first and
 * grouped by month — the records wall read as a history rather than a
 * standing.
 *
 * **The same `sessionRecords` every other screen reads**, so a record on
 * the timeline is a record on the session page and in the report, and no
 * screen counts one the others do not. Finished sessions only.
 */
export function recordTimeline(logs: readonly WorkoutLog[]): readonly RecordMonth[] {
  const finished = logs.filter((log) => log.status === 'completed')
  const by = sessionRecords(finished)
  const all = finished
    .flatMap((log) =>
      (by.get(log.id) ?? []).map((record) => ({
        ...record,
        date: log.date,
        workoutId: log.id,
        title: log.title,
      })),
    )
    .toSorted((a, b) => b.date.localeCompare(a.date))

  const months: RecordMonth[] = []
  for (const record of all) {
    const month = record.date.slice(0, 7)
    const last = months.at(-1)
    if (last?.month === month)
      months[months.length - 1] = { month, records: [...last.records, record] }
    else months.push({ month, records: [record] })
  }
  return months
}
