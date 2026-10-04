import { describe, expect, it } from 'vitest'

import { tempoAt } from './tempo'

const SLOW = { lower: 3, hold: 1, lift: 1 }

describe('where a set is in its tempo', () => {
  it('walks the parts of a rep in order, counting each down', () => {
    expect(tempoAt(SLOW, 0)).toEqual({ rep: 1, phase: 'lower', left: 3 })
    expect(tempoAt(SLOW, 2_100)).toEqual({ rep: 1, phase: 'lower', left: 1 })
    expect(tempoAt(SLOW, 3_000)).toEqual({ rep: 1, phase: 'hold', left: 1 })
    expect(tempoAt(SLOW, 4_500)).toEqual({ rep: 1, phase: 'lift', left: 1 })
  })

  it('starts the next rep when one ends', () => {
    expect(tempoAt(SLOW, 5_000)).toEqual({ rep: 2, phase: 'lower', left: 3 })
    expect(tempoAt(SLOW, 26_000)).toMatchObject({ rep: 6 })
  })

  /* A 2-0-1 rep has no hold to pass through. */
  it('skips a part of nought seconds', () => {
    const quick = { lower: 2, hold: 0, lift: 1 }
    expect(tempoAt(quick, 2_000)).toEqual({ rep: 1, phase: 'lift', left: 1 })
    expect(tempoAt(quick, 3_000)).toEqual({ rep: 2, phase: 'lower', left: 2 })
  })
})
