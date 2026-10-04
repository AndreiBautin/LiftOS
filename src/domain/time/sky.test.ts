import { describe, expect, it } from 'vitest'

import { skyAt, skyPhase } from './sky'

describe('the sky behind the app', () => {
  it('sits low on the left at dawn and low on the right at dusk', () => {
    const dawn = skyAt(6.5)
    const dusk = skyAt(19.5)
    expect(dawn.x).toBeLessThan(30)
    expect(dawn.y).toBeGreaterThan(80)
    expect(dusk.x).toBeGreaterThan(70)
    expect(dusk.y).toBeGreaterThan(80)
  })

  it('moves continuously rather than switching at a stop', () => {
    const before = skyAt(6.49)
    const after = skyAt(6.51)
    expect(Math.abs(after.x - before.x)).toBeLessThan(1)
    expect(Math.abs(after.strength - before.strength)).toBeLessThan(0.01)
  })

  /* 285 to 25 the short way passes 330 (magenta), never 150 (green). */
  it('turns hue the short way round', () => {
    const between = skyAt(5.75).hue
    expect(between > 300 || between < 30).toBe(true)
  })

  it('wraps midnight without a jump', () => {
    const late = skyAt(23.99)
    const early = skyAt(0.01)
    expect(Math.abs(late.x - early.x)).toBeLessThan(1)
    expect(skyAt(24)).toEqual(skyAt(0))
  })

  it('names the part of the day', () => {
    expect(skyPhase(6)).toBe('dawn')
    expect(skyPhase(12)).toBe('day')
    expect(skyPhase(19)).toBe('dusk')
    expect(skyPhase(2)).toBe('night')
  })
})
