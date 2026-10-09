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

  it('credits one rep per other set at the same load and at least as many reps', () => {
    const straight = [
      { load: 100, reps: 10 },
      { load: 100, reps: 10 },
      { load: 100, reps: 10 },
    ]
    expect(inferredReserve(straight, 0)).toBe(2)
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
    // The last set was matched twice over by the sets before it.
    expect(inferredReserve(fading, 2)).toBe(2)
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
