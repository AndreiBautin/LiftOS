import { describe, expect, it } from 'vitest'

import { shiftDay } from '@/domain/time/day'

import { forecastLift, forecastTotal } from './forecast'
import type { TrendPoint } from './trend'

/* Weekly sessions from a start, the value given by a function of the week. */
const weekly = (count: number, value: (week: number) => number): TrendPoint[] =>
  Array.from({ length: count }, (_, week) => ({
    date: shiftDay('2026-07-06', week * 7),
    value: value(week),
  }))

describe('where a lift is heading', () => {
  it('carries the fitted line forward a week at a time', () => {
    const result = forecastLift(
      weekly(8, (week) => 300 + 5 * week),
      12,
    )
    expect(result?.slopePerWeek).toBeCloseTo(5)
    expect(result?.from.mid).toBeCloseTo(335)
    expect(result?.ahead).toHaveLength(12)
    expect(result?.ahead[11]?.mid).toBeCloseTo(335 + 60)
  })

  /* A perfect line would otherwise forecast as a thread. */
  it('widens the band with distance, even through a perfect line', () => {
    const result = forecastLift(
      weekly(8, (week) => 300 + 5 * week),
      12,
    )
    const width = (at: number) => (result?.ahead[at]?.high ?? 0) - (result?.ahead[at]?.low ?? 0)
    expect(width(0)).toBeGreaterThan(0)
    expect(width(11)).toBeGreaterThan(width(5))
    expect(width(5)).toBeGreaterThan(width(0))
  })

  it('draws a wider band through noisier sessions', () => {
    const steady = forecastLift(
      weekly(8, (week) => 300 + 5 * week),
      12,
    )
    const noisy = forecastLift(
      weekly(8, (week) => 300 + 5 * week + (week % 2 === 0 ? 12 : -12)),
      12,
    )
    const width = (forecast: typeof steady) =>
      (forecast?.ahead[11]?.high ?? 0) - (forecast?.ahead[11]?.low ?? 0)
    expect(width(noisy)).toBeGreaterThan(width(steady))
  })

  it('forecasts a falling lift as falling rather than staying quiet', () => {
    const result = forecastLift(
      weekly(8, (week) => 300 - 3 * week),
      12,
    )
    expect(result?.slopePerWeek).toBeLessThan(0)
  })

  it('says nothing from too little', () => {
    expect(
      forecastLift(
        weekly(3, () => 300),
        12,
      ),
    ).toBeUndefined()
    expect(forecastLift([], 12)).toBeUndefined()
  })
})

describe('where the total is heading', () => {
  const lift = (base: number) =>
    forecastLift(
      weekly(8, (week) => base + 5 * week),
      12,
    )

  it('sums the lifts, its band narrower than the three widths added', () => {
    const lifts = [lift(300), lift(200), lift(400)]
    const total = forecastTotal(lifts)
    expect(total?.[11]?.mid).toBeCloseTo((lifts[0]?.ahead[11]?.mid ?? 0) * 3, -2)
    const added = lifts.reduce(
      (sum, one) => sum + (one?.ahead[11]?.high ?? 0) - (one?.ahead[11]?.low ?? 0),
      0,
    )
    expect((total?.[11]?.high ?? 0) - (total?.[11]?.low ?? 0)).toBeLessThan(added)
  })

  it('is absent without all three lifts', () => {
    expect(forecastTotal([lift(300), undefined, lift(400)])).toBeUndefined()
  })
})
