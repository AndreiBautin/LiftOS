import type { MuscleGroup } from '@/domain/exercises/taxonomy'
import type { CheckInId, WorkoutId } from '@/domain/ids/ids'

/**
 * Pre- and post-workout check-ins.
 *
 * StrengthFlow's most interesting idea and its worst-implemented one. It
 * asked, before a session, whether each muscle had recovered, and after
 * one, how hard the workload felt — then wrote the answer straight into a
 * per-muscle `volume` counter with `increment(-1)` or `increment(+1)`.
 * No record of the answer survived, there was no floor or ceiling, no
 * undo, and the counter it moved had no relationship to what the program
 * actually prescribed. Answer "not recovered" often enough and a muscle's
 * volume walked to zero with nothing to say why.
 *
 * The idea is sound: it is exactly how Renaissance Periodization proposes
 * finding a lifter's real volume tolerance. What was missing was that the
 * answers are *evidence*, not commands. Here a check-in is an immutable
 * record, and adjusting a landmark is a separate, bounded, explained
 * proposal derived from those records — reviewable before it applies and
 * reversible after, because the evidence is still there.
 */

type RecoveryState = 'not-recovered' | 'recovered-on-time' | 'recovered-early'

export const WORKLOAD_STATES = ['easy', 'moderate', 'hard', 'too-much'] as const
export type WorkloadState = (typeof WORKLOAD_STATES)[number]

/**
 * Lifestyle factors, asked before a session.
 *
 * Deliberately kept separate from the recovery ratings, because they mean
 * something different. Sleeping badly for one night is a reason to cut
 * *today's* volume; it is not evidence that a muscle's weekly tolerance
 * has changed. StrengthFlow ran both through the same code path, so a bad
 * night's sleep permanently reduced the program.
 */
type ReadinessLevel = 'poor' | 'ok' | 'good'

interface ReadinessFactors {
  readonly sleep: ReadinessLevel
  readonly nutrition: ReadinessLevel
  readonly hydration: ReadinessLevel
  readonly stress: ReadinessLevel
  readonly motivation: ReadinessLevel
}

export interface PreWorkoutCheckIn {
  readonly id: CheckInId
  readonly kind: 'pre'
  readonly workoutId: WorkoutId
  readonly recordedAt: string
  readonly recovery: Readonly<Partial<Record<MuscleGroup, RecoveryState>>>
  readonly readiness: ReadinessFactors
  readonly notes?: string
  /**
   * When this record last changed, ISO.
   *
   * Optional because records written before it existed do not have one,
   * and a migration cannot invent a truthful value for them. Everything
   * that compares it treats "absent" as "older than anything that can
   * name a time", which is the only safe reading: a record that cannot
   * prove it is newer must not win a merge.
   *
   * Stamped by the repository on save rather than by callers, so it
   * cannot be forgotten on one write path out of five.
   */
  readonly updatedAt?: string
}

export interface PostWorkoutCheckIn {
  readonly id: CheckInId
  readonly kind: 'post'
  readonly workoutId: WorkoutId
  readonly recordedAt: string
  readonly workload: Readonly<Partial<Record<MuscleGroup, WorkloadState>>>
  /** Overall session RPE, 1–10. Optional; the per-muscle answers matter more. */
  readonly sessionRpe?: number
  readonly notes?: string
  /**
   * When this record last changed, ISO.
   *
   * Optional because records written before it existed do not have one,
   * and a migration cannot invent a truthful value for them. Everything
   * that compares it treats "absent" as "older than anything that can
   * name a time", which is the only safe reading: a record that cannot
   * prove it is newer must not win a merge.
   *
   * Stamped by the repository on save rather than by callers, so it
   * cannot be forgotten on one write path out of five.
   */
  readonly updatedAt?: string
}

export type CheckIn = PreWorkoutCheckIn | PostWorkoutCheckIn
