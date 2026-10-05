import { describe, expect, it } from 'vitest'

import { nearestLoadable, platesFor, rackFor } from './plates'

describe('loading a bar', () => {
  it('loads the heaviest plates first, the way a person does', () => {
    expect(platesFor(315, 'lb')).toEqual({ bar: 45, perSide: [45, 45, 45], leftover: 0 })
    expect(platesFor(235, 'lb')?.perSide).toEqual([45, 45, 5])
  })

  it('reaches the small plates', () => {
    expect(platesFor(140, 'lb')?.perSide).toEqual([45, 2.5])
    expect(platesFor(102.5, 'kg')?.perSide).toEqual([25, 15, 1.25])
  })

  it('has nothing to add to an empty bar, and nothing at all below it', () => {
    expect(platesFor(45, 'lb')).toEqual({ bar: 45, perSide: [], leftover: 0 })
    expect(platesFor(30, 'lb')).toBeUndefined()
  })

  /*
   * A load the plates cannot make is reported, not rounded away: showing
   * 227 lb as 225 would be drawing a different bar from the one logged.
   */
  it('reports what the plates cannot make', () => {
    expect(platesFor(227, 'lb')).toEqual({ bar: 45, perSide: [45, 45], leftover: 1 })
  })

  it('starts an EZ bar from its own weight', () => {
    expect(platesFor(65, 'lb', 'ez-bar')?.perSide).toEqual([10, 10])
  })
})

describe('the nearest loads the plates make', () => {
  it('offers the loads either side of one they cannot make', () => {
    expect(nearestLoadable(227, 'lb')).toEqual({ below: 225, above: 230 })
  })

  it('offers nothing for a load that already loads clean', () => {
    expect(nearestLoadable(225, 'lb')).toBeUndefined()
  })

  /* A gym with no 5s and no 2.5s cannot make 230. */
  it('reads the plates to hand', () => {
    expect(nearestLoadable(230, 'lb', 'barbell', [45, 35, 25, 10])).toEqual({
      below: 225,
      above: 235,
    })
  })

  /* Heaviest-first reads 95 a side as 45 + 45 and five over. */
  it('loads a side exactly where heaviest-first would leave some over', () => {
    expect(platesFor(235, 'lb', 'barbell', [45, 35, 25, 10])).toEqual({
      bar: 45,
      perSide: [45, 25, 25],
      leftover: 0,
    })
  })

  it('offers the empty bar for a load below it', () => {
    expect(nearestLoadable(30, 'lb')).toEqual({ above: 45 })
    expect(nearestLoadable(22, 'lb', 'ez-bar')).toEqual({ above: 25 })
  })

  it('works in kilograms', () => {
    expect(nearestLoadable(101, 'kg')).toEqual({ below: 100, above: 102.5 })
  })
})

describe('plates by the pair', () => {
  const rack = { plates: [45, 35, 25, 10, 5, 2.5], pairs: { '45': 1 } }

  it('uses no more of a plate than there are pairs of it', () => {
    // 315 is three 45s a side; with one pair the side is made another way.
    expect(platesFor(315, 'lb', 'barbell', rack)).toEqual({
      bar: 45,
      perSide: [45, 35, 35, 10, 10],
      leftover: 0,
    })
  })

  it('reports what is left when the rack cannot make the load', () => {
    const one = { plates: [45], pairs: { '45': 1 } }
    expect(platesFor(225, 'lb', 'barbell', one)).toEqual({ bar: 45, perSide: [45], leftover: 45 })
  })

  it('offers the nearest loads the rack can make', () => {
    const one = { plates: [45, 25], pairs: { '45': 1, '25': 1 } }
    expect(nearestLoadable(205, 'lb', 'barbell', one)).toEqual({ below: 185, above: undefined })
  })

  it('builds a rack only from counts for plates to hand', () => {
    expect(rackFor([45, 25], 'lb', { '45': 2, '35': 1, '25': 0 })).toEqual({
      plates: [45, 25],
      pairs: { '45': 2 },
    })
    expect(rackFor(undefined, 'lb', undefined)).toEqual([45, 35, 25, 10, 5, 2.5])
  })
})
