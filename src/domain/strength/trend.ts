import { STRENGTH_LIFT_SLUGS } from '@/domain/exercises/catalogue'
import { asExerciseId, type ExerciseId } from '@/domain/ids/ids'
import { estimateFromWorkout, type WorkoutLog } from '@/domain/logging/workout-log'

/**
 * Each competition lift's estimated max, session by session.
 *
 * **The same estimate the session report shows**, read back off the logs
 * with `estimateFromWorkout` — so a point on the chart is a number the
 * app already said once, on the day, rather than a second derivation that
 * could disagree with it. Only reliable estimates are plotted: a set of
 * fifteen produces a figure the formula is not fitted for, and a line
 * that jumped every time somebody did a light day would be a chart of the
 * formula's error rather than of the lifter.
 *
 * Completed sessions only. An abandoned one still holds real sets, but
 * the report never read it, and the chart should not know more than the
 * screen that files the session.
 */
export type TrendLift = keyof typeof STRENGTH_LIFT_SLUGS

export interface TrendPoint {
  readonly date: string
  readonly value: number
}

export type StrengthTrend = Readonly<Record<TrendLift, readonly TrendPoint[]>>

/**
 * Each competition lift's max as its **most recent** finished session
 * measured it, keyed by exercise id so it drops straight over the
 * stored maxes.
 *
 * Asked for as _"why can't it just be inferred from the most recent
 * session of that lift? (unless deload of course)"_. A deload session
 * is skipped — the bar is lighter by design and says nothing new about
 * the lifter — and so is an unreliable estimate, by the trend's own
 * rule. The caller says which sessions are deloads, because that is read
 * off the programme's weeks and the domain here holds no programme. A
 * lift with no qualifying session is absent, so a stored max stands in.
 */
export function measuredMaxes(
  logs: readonly WorkoutLog[],
  isDeload: (log: WorkoutLog) => boolean,
): Readonly<Partial<Record<ExerciseId, number>>> {
  const done = logs
    .filter((log) => log.status === 'completed' && !isDeload(log))
    .toSorted((a, b) => b.date.localeCompare(a.date))

  const measured: Partial<Record<ExerciseId, number>> = {}
  for (const slug of Object.values(STRENGTH_LIFT_SLUGS)) {
    const id = asExerciseId(slug)
    for (const log of done) {
      const estimate = estimateFromWorkout(log, id)
      if (estimate?.isReliable === true) {
        measured[id] = Math.round(estimate.value)
        break
      }
    }
  }
  return measured
}

export function strengthTrend(logs: readonly WorkoutLog[]): StrengthTrend {
  const done = logs
    .filter((log) => log.status === 'completed')
    .toSorted((a, b) => a.date.localeCompare(b.date))

  const seriesFor = (lift: TrendLift): readonly TrendPoint[] =>
    done.flatMap((log) => {
      const estimate = estimateFromWorkout(log, STRENGTH_LIFT_SLUGS[lift] as ExerciseId)
      return estimate?.isReliable === true
        ? [{ date: log.date, value: Math.round(estimate.value) }]
        : []
    })

  return {
    squat: seriesFor('squat'),
    bench: seriesFor('bench'),
    deadlift: seriesFor('deadlift'),
  }
}
