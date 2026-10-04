import { describe, expect, it } from 'vitest'

import { agoLabel } from './ago'

const at = (iso: string) => new Date(iso)

describe('how long ago, in a corner', () => {
  const now = at('2026-10-04T12:00:00Z')

  it('says now inside a minute, and never a negative', () => {
    expect(agoLabel(at('2026-10-04T11:59:30Z'), now)).toBe('now')
    expect(agoLabel(at('2026-10-04T12:05:00Z'), now)).toBe('now')
  })

  it('steps through minutes, hours and days', () => {
    expect(agoLabel(at('2026-10-04T11:56:00Z'), now)).toBe('4m')
    expect(agoLabel(at('2026-10-04T10:00:00Z'), now)).toBe('2h')
    expect(agoLabel(at('2026-10-01T12:00:00Z'), now)).toBe('3d')
  })
})
