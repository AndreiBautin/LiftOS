import { describe, expect, it } from 'vitest'

import { strengthTable } from './calculator'
import { repMaxTable } from './rep-max'

describe('the strength calculator', () => {
  const table = strengthTable(225, 5, 'epley', 5)

  it('reads the max a set implies', () => {
    expect(table?.estimate.value).toBeCloseTo(262.5)
    expect(table?.estimate.isReliable).toBe(true)
  })

  /* A prediction rounded up is a bar that fails. */
  it('rounds every load down to one the rounding can make', () => {
    expect(table?.percents.find((row) => row.percent === 100)?.load).toBe(260)
    expect(table?.percents.find((row) => row.percent === 85)?.load).toBe(220)
    expect(table?.reps.every((row) => row.load % 5 === 0)).toBe(true)
  })

  it('gives the set itself back at its own rep count', () => {
    expect(table?.reps.find((row) => row.reps === 5)?.load).toBe(225)
    expect(table?.reps.find((row) => row.reps === 1)?.load).toBe(260)
  })

  it('reads nothing from a set with no load or no reps', () => {
    expect(strengthTable(0, 5, 'epley', 5)).toBeUndefined()
    expect(strengthTable(225, 0, 'epley', 5)).toBeUndefined()
    expect(strengthTable(225, 2.5, 'epley', 5)).toBeUndefined()
  })

  /* The rep-max card had the same dust: it read a 225 × 5 estimate's own row as 220. */
  it('agrees with the rep-max card on the set it came from', () => {
    expect(repMaxTable(262.5, [], 'epley', 5).find((row) => row.reps === 5)?.predicted).toBe(225)
  })
})
