import { describe, expect, it } from 'vitest'

import { calendarFile } from './calendar'

const STAMP = '20261003T120000Z'

describe('the sessions as a calendar file', () => {
  const file = calendarFile(
    [
      { on: '2026-10-05', title: 'Monday — Upper', description: 'Bench Press, then rows; curls' },
      { on: '2026-10-06', title: 'Tuesday — Legs A' },
    ],
    { start: '18:30', minutes: 75 },
    STAMP,
  )
  const lines = file.split('\r\n')

  it('writes one event a session, at a floating local time', () => {
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(2)
    expect(lines).toContain('DTSTART:20261005T183000')
    expect(lines).toContain('DTEND:20261005T194500')
  })

  /* Importing again must update the events, not double them. */
  it('gives each day a stable UID', () => {
    expect(lines).toContain('UID:2026-10-05@liftos')
    expect(lines).toContain('UID:2026-10-06@liftos')
  })

  it('escapes commas and semicolons and ends lines with CRLF', () => {
    expect(lines).toContain('DESCRIPTION:Bench Press\\, then rows\\; curls')
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('runs an evening session past midnight into the next day', () => {
    const late = calendarFile(
      [{ on: '2026-10-31', title: 'Late' }],
      { start: '23:30', minutes: 60 },
      STAMP,
    )
    expect(late).toContain('DTEND:20261101T003000')
  })

  it('folds a long line at 75 characters', () => {
    const long = calendarFile(
      [{ on: '2026-10-05', title: 'x'.repeat(120) }],
      { start: '18:00', minutes: 60 },
      STAMP,
    )
    const folded = long.split('\r\n')
    const at = folded.findIndex((line) => line.startsWith('SUMMARY:'))
    expect(folded[at]).toHaveLength(75)
    expect(folded[at + 1]?.startsWith(' ')).toBe(true)
  })
})
