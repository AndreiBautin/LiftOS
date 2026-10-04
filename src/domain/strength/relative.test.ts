import { describe, expect, it } from 'vitest'

import { relativeSeries } from './relative'

describe('a series against its own start', () => {
  it('reads each point as a share of the first', () => {
    expect(
      relativeSeries([
        { date: '2026-08-01', value: 275 },
        { date: '2026-09-01', value: 305 },
      ]).map((point) => point.percent),
    ).toEqual([100, 110.9])
  })

  it('drops readings of nought, and starts from the first real one', () => {
    expect(
      relativeSeries([
        { date: '2026-08-01', value: 0 },
        { date: '2026-08-08', value: 30 },
        { date: '2026-09-01', value: 35 },
      ]),
    ).toEqual([
      { date: '2026-08-08', value: 30, percent: 100 },
      { date: '2026-09-01', value: 35, percent: 116.7 },
    ])
  })

  it('is empty rather than a flat line when there is nothing to read', () => {
    expect(relativeSeries([])).toEqual([])
    expect(relativeSeries([{ date: '2026-08-01', value: 0 }])).toEqual([])
  })
})
