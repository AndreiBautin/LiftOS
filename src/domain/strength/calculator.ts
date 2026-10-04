import { roundLoad } from '@/domain/units/weight'

import { estimateOneRepMax, type E1rmEstimate, type E1rmFormula } from './one-rep-max'
import { loadForReps } from './rep-max'

/** The rep counts the calculator lists. */
export const CALCULATOR_REPS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const
/** The percentages it lists, of the estimated max. */
export const CALCULATOR_PERCENTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50] as const

export interface StrengthTable {
  readonly estimate: E1rmEstimate
  readonly reps: readonly { readonly reps: number; readonly load: number }[]
  readonly percents: readonly { readonly percent: number; readonly load: number }[]
}

/**
 * One set, read every way a lifter asks of it: the max it implies, what
 * the same strength should manage for other rep counts, and the usual
 * percentages — each **rounded down to a bar the rounding can load**,
 * because a prediction rounded up is a bar that fails.
 *
 * The formula is the one in Settings, run both ways through
 * `estimateOneRepMax` and `loadForReps`, so this agrees with the rep-max
 * card on every exercise page. Undefined for a set that cannot be read: no
 * load, or no reps.
 */
export function strengthTable(
  load: number,
  reps: number,
  formula: E1rmFormula,
  increment: number,
): StrengthTable | undefined {
  if (!(load > 0) || !Number.isInteger(reps) || reps < 1) return undefined
  const estimate = estimateOneRepMax(load, reps, formula)
  return {
    estimate,
    reps: CALCULATOR_REPS.map((count) => ({
      reps: count,
      load: down(loadForReps(estimate.value, count, formula), increment),
    })),
    percents: CALCULATOR_PERCENTS.map((percent) => ({
      percent,
      load: down((estimate.value * percent) / 100, increment),
    })),
  }
}

/**
 * Rounds down, after forgiving floating-point dust: 262.5 run back
 * through Epley for five reps is 224.99999…, and rounding that down gave
 * the set's own 225 back as 220 — found by the test that asks for it.
 */
function down(value: number, increment: number): number {
  return roundLoad(value + 1e-6, increment, 'down')
}
