import { describe, expect, it } from 'vitest'

import { formatDate, formatTime } from './format-date'

/*
 * Every call site moved here from `toLocaleDateString` /
 * `toLocaleTimeString`, so the one thing that must hold is that the words
 * do not change — including the defaults those methods add when no part of
 * the date or the time is named.
 */
const at = new Date(2026, 9, 13, 18, 5, 9)
const cases: readonly Intl.DateTimeFormatOptions[] = [
  { weekday: 'long' },
  { month: 'short' },
  { month: 'short', day: 'numeric' },
  { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' },
  { month: 'long', year: 'numeric' },
  { hour: 'numeric', minute: '2-digit' },
  { timeZone: 'UTC' },
  {},
]

describe('the cached date formatter', () => {
  it.each(cases)('reads as toLocaleDateString does for %o', (options) => {
    expect(formatDate(at, options)).toBe(at.toLocaleDateString(undefined, options))
    expect(formatDate(at, options, 'en-US')).toBe(at.toLocaleDateString('en-US', options))
  })

  it.each(cases)('reads as toLocaleTimeString does for %o', (options) => {
    expect(formatTime(at, options)).toBe(at.toLocaleTimeString(undefined, options))
  })
})
