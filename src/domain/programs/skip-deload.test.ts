import { describe, expect, it } from 'vitest'

import { weekIndexToStartOn } from './schedule'

/* 2026-10-04 is a Sunday; 2026-10-05 the Monday after. */
describe('starting the block again at the session in view', () => {
  it('sets this week to the first when the session is this week', () => {
    expect(weekIndexToStartOn('2026-10-02', '2026-10-01', 7)).toBe(0)
  })

  /* A rest day at the week's end shows next week's session. */
  it('counts back from a session in the week after, into the block before', () => {
    expect(weekIndexToStartOn('2026-10-05', '2026-10-04', 7)).toBe(6)
  })

  it('wraps for a session further ahead', () => {
    expect(weekIndexToStartOn('2026-10-12', '2026-10-04', 7)).toBe(5)
  })
})
