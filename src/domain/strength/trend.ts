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
  const kept = logs.filter((log) => !isDeload(log))
  const measured: Partial<Record<ExerciseId, number>> = {}
  for (const slug of Object.values(STRENGTH_LIFT_SLUGS)) {
    const last = progressedSeries(kept, asExerciseId(slug)).at(-1)
    if (last !== undefined) measured[asExerciseId(slug)] = last.value
  }
  return measured
}

/**
 * One lift's reliable estimates, oldest first, **with a step up the bar
 * never reading as a step down**. Asked for as _"when you hit the top of
 * the range and up the weight while resetting at the bottom, the
 * estimate shows lower despite the fact that you clearly didn't get
 * weaker"_. Double progression trades reps for load on purpose: 100 x 15
 * becomes 105 x 10, and every formula reads the second as weaker. So a
 * session whose top bar is heavier than the previous session's carries
 * the previous estimate forward when its own reads lower. A session at
 * the same or a lighter bar that reads lower is a real reading and is
 * kept.
 */
function progressedSeries(logs: readonly WorkoutLog[], id: ExerciseId): readonly TrendPoint[] {
  const done = logs
    .filter((log) => log.status === 'completed')
    .toSorted((a, b) => a.date.localeCompare(b.date))
  const points: TrendPoint[] = []
  let previousBar: number | undefined
  for (const log of done) {
    const estimate = estimateFromWorkout(log, id)
    if (estimate?.isReliable !== true) continue
    const bar = topBar(log, id)
    const value = Math.round(estimate.value)
    const before = points.at(-1)?.value
    const steppedUp = previousBar !== undefined && bar > previousBar
    points.push({
      date: log.date,
      value: steppedUp && before !== undefined && value < before ? before : value,
    })
    previousBar = bar
  }
  return points
}

function topBar(log: WorkoutLog, id: ExerciseId): number {
  return Math.max(
    0,
    ...log.entries
      .filter((entry) => entry.exerciseId === id)
      .flatMap((entry) => entry.sets)
      .filter((set) => set.outcome === 'completed' && !set.isWarmup)
      .map((set) => set.actualLoad ?? 0),
  )
}

export function strengthTrend(logs: readonly WorkoutLog[]): StrengthTrend {
  return {
    squat: progressedSeries(logs, STRENGTH_LIFT_SLUGS.squat as ExerciseId),
    bench: progressedSeries(logs, STRENGTH_LIFT_SLUGS.bench as ExerciseId),
    deadlift: progressedSeries(logs, STRENGTH_LIFT_SLUGS.deadlift as ExerciseId),
  }
}

/** One competition lift as the SBD total reads it. */
export interface SbdLift {
  readonly lift: TrendLift
  readonly exerciseId: ExerciseId
  readonly max: number | undefined
  /** The session that measured it, or null when the stored max stands in. */
  readonly measuredOn: string | null
}

/**
 * The SBD total exactly as the hero banner computes it, with where each
 * lift's number came from — so the sync file can carry the app's own
 * answer rather than leave another app to re-derive it and drift.
 * Reported once already: Jarvis read 1011 while this app said 1018.
 */
export function sbdSummary(
  logs: readonly WorkoutLog[],
  isDeload: (log: WorkoutLog) => boolean,
  storedMaxes: Readonly<Partial<Record<ExerciseId, number>>>,
): { readonly lifts: readonly SbdLift[]; readonly total: number | undefined } {
  const kept = logs.filter((log) => !isDeload(log))
  const lifts = (Object.keys(STRENGTH_LIFT_SLUGS) as TrendLift[]).map((lift): SbdLift => {
    const exerciseId = asExerciseId(STRENGTH_LIFT_SLUGS[lift])
    const last = progressedSeries(kept, exerciseId).at(-1)
    return last === undefined
      ? { lift, exerciseId, max: storedMaxes[exerciseId], measuredOn: null }
      : { lift, exerciseId, max: last.value, measuredOn: last.date }
  })
  const maxes = lifts.map((lift) => lift.max)
  const total = maxes.every((max): max is number => max !== undefined)
    ? maxes.reduce((sum, max) => sum + max, 0)
    : undefined
  return { lifts, total }
}
