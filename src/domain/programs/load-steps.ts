import type { Exercise } from '@/domain/exercises/exercise'

import { stepFor } from './progression'

/**
 * When the next load is too big a jump, and a smaller one to take instead.
 *
 * Double progression adds one step once every set tops its range — five
 * pounds on the upper body. On a 225 bench that is 2%; on a 20 lb lateral
 * raise it is **25%**, and the reps fall from the top of the range to below
 * the bottom, the lift stalls, and the ladder reads as failing at the one
 * thing it was built to do. Above `BIG_JUMP` the exercise page offers half
 * the step, **offered, never applied**, because only the lifter knows
 * whether there are 2.5 lb plates or 22.5 lb dumbbells in the gym.
 */
export const BIG_JUMP = 0.1

/** The share of the current load the next step adds; absent without a load. */
export function stepJump(load: number | undefined, step: number): number | undefined {
  return load === undefined || load <= 0 ? undefined : step / load
}

/** Half the step, never finer than 1.25 — the smallest plate anybody owns. */
export function smallerStep(step: number): number {
  return Math.max(1.25, step / 2)
}

/** The step a lift would take with no override: the catalogue's rule. */
export function defaultStepFor(exercise: Exercise): number {
  const { loadStep: _override, ...rest } = exercise
  return stepFor(rest)
}

/**
 * The library with each lifter-chosen step applied. A step that is not a
 * positive number is ignored rather than trusted — a zero would plan the
 * same bar forever.
 */
export function withLoadSteps(
  library: readonly Exercise[],
  steps: Readonly<Record<string, number>> | undefined,
): readonly Exercise[] {
  if (steps === undefined) return library
  return library.map((exercise) => {
    const step = steps[exercise.id]
    return step !== undefined && Number.isFinite(step) && step > 0
      ? { ...exercise, loadStep: step }
      : exercise
  })
}
