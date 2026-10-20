import { describe, expect, it } from 'vitest'

import {
  bestEstimate,
  estimateOneRepMax,
  inferredReserve,
  MAX_INFERRED_RESERVE,
} from './one-rep-max'

describe('inferredReserve', () => {
  it('reads a set done once as given', () => {
    expect(inferredReserve([{ load: 100, reps: 10 }], 0)).toBe(0)
  })

  it('credits the full reserve when every other set held it', () => {
    const straight = [
      { load: 100, reps: 10 },
      { load: 100, reps: 10 },
      { load: 100, reps: 10 },
    ]
    expect(inferredReserve(straight, 0)).toBe(MAX_INFERRED_RESERVE)
  })

  /*
   * The leg days' compounds went from four sets to two, and a count of
   * matching sets read the same clean work as one rep of reserve where it
   * had been three — the total fell on a session that hit its progression.
   */
  it('reads two straight sets the same as four', () => {
    const two = Array.from({ length: 2 }, () => ({ load: 300, reps: 5 }))
    const four = Array.from({ length: 4 }, () => ({ load: 300, reps: 5 }))
    expect(inferredReserve(two, 0)).toBe(inferredReserve(four, 0))
  })

  it('credits a share of the reserve when only some sets held it', () => {
    const partial = [
      { load: 100, reps: 10 },
      { load: 100, reps: 10 },
      { load: 100, reps: 9 },
      { load: 100, reps: 8 },
    ]
    // One of three other sets held ten: a third of three.
    expect(inferredReserve(partial, 0)).toBe(1)
  })

  it('caps the reserve at three however many sets repeat', () => {
    const six = Array.from({ length: 6 }, () => ({ load: 100, reps: 10 }))
    expect(inferredReserve(six, 0)).toBe(MAX_INFERRED_RESERVE)
  })

  it('does not credit a top set that fell off on the sets after it', () => {
    const fading = [
      { load: 100, reps: 10 },
      { load: 100, reps: 8 },
      { load: 100, reps: 7 },
    ]
    expect(inferredReserve(fading, 0)).toBe(0)
    // The last set was matched by both sets before it.
    expect(inferredReserve(fading, 2)).toBe(MAX_INFERRED_RESERVE)
  })

  it('ignores sets at another load', () => {
    const ramp = [
      { load: 90, reps: 10 },
      { load: 100, reps: 10 },
    ]
    expect(inferredReserve(ramp, 1)).toBe(0)
  })
})

describe('estimateOneRepMax with reserve', () => {
  it('reads the set as the one it would have been to failure', () => {
    expect(estimateOneRepMax(100, 10, 'epley', 3).value).toBe(
      estimateOneRepMax(100, 13, 'epley').value,
    )
  })

  it('reports the reserve it was read with and the reps actually done', () => {
    const estimate = estimateOneRepMax(100, 10, 'epley', 2)
    expect(estimate.reps).toBe(10)
    expect(estimate.reserve).toBe(2)
  })

  it('judges reliability on the reps done, not the reps credited', () => {
    expect(estimateOneRepMax(100, 10, 'epley', 3).isReliable).toBe(true)
  })
})

describe('bestEstimate', () => {
  it('reads four straight sets higher than one limit set of the same reps', () => {
    const one = bestEstimate([{ load: 100, reps: 10 }])
    const four = bestEstimate(Array.from({ length: 4 }, () => ({ load: 100, reps: 10 })))
    expect(four?.value).toBeGreaterThan(one?.value ?? Infinity)
    expect(four?.reserve).toBe(3)
    expect(four?.value).toBe(estimateOneRepMax(100, 13).value)
  })

  it('still prefers the one hard set over several easy ones', () => {
    const best = bestEstimate([
      { load: 140, reps: 3 },
      { load: 100, reps: 10 },
      { load: 100, reps: 10 },
    ])
    expect(best?.reps).toBe(3)
    expect(best?.reserve).toBe(0)
  })
})
