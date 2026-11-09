import { parseDay } from '@/domain/time/day'

import type { WorkoutLog } from './workout-log'

/** A gap under this is an ordinary week, and not worth a line. */
const BREAK_DAYS = 8

export interface TimelineSession {
  readonly log: WorkoutLog
  /** Whole weeks off between this session and the one before it, when there was a break. */
  readonly weeksOffBefore?: number
}

interface TimelineMonth {
  /** `YYYY-MM`. */
  readonly month: string
  readonly sessions: readonly TimelineSession[]
}

/**
 * History as a line through time, newest first, cut into months, with a break
 * said where one happened. **The breaks are the reason this is a timeline and
 * not a list**: a list of sessions reads the same whether they were a week
 * apart or a season, and the gap is often the most interesting thing in it.
 *
 * Takes logs newest first, as every read of the store returns them. Sessions
 * filtered out by a search would read as breaks, so a caller showing search
 * results should not ask for them (`withBreaks`).
 */
export function historyTimeline(
  logs: readonly WorkoutLog[],
  { withBreaks }: { readonly withBreaks: boolean },
): readonly TimelineMonth[] {
  const months = new Map<string, TimelineSession[]>()
  logs.forEach((log, at) => {
    const older = logs[at + 1]
    const days = older === undefined ? 0 : daysBetween(older.date, log.date)
    const session: TimelineSession =
      withBreaks && days >= BREAK_DAYS
        ? { log, weeksOffBefore: Math.max(1, Math.round(days / 7)) }
        : { log }
    const month = log.date.slice(0, 7)
    months.set(month, [...(months.get(month) ?? []), session])
  })
  return [...months.entries()].map(([month, sessions]) => ({ month, sessions }))
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000)
}
