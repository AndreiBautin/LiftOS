import { describe, expect, it } from 'vitest'

import { SCREEN_GROUPS, SCREENS, screenPath } from './screens'

describe('the list of screens', () => {
  it('names each screen once, in a group that exists', () => {
    expect(new Set(SCREENS.map((screen) => screen.id)).size).toBe(SCREENS.length)
    for (const screen of SCREENS) expect(SCREEN_GROUPS).toContain(screen.group)
  })

  it('leaves no group empty, or the sheet draws a heading over nothing', () => {
    for (const group of SCREEN_GROUPS)
      expect(SCREENS.some((screen) => screen.group === group)).toBe(true)
  })

  it('addresses a screen by date from today', () => {
    const wrapped = SCREENS.find((screen) => screen.id === 'wrapped')
    expect(wrapped && screenPath(wrapped, '2026-10-03')).toBe('/wrapped/2026')
  })
})
