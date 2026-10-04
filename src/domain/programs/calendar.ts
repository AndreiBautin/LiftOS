import { shiftDay } from '@/domain/time/day'

/** One session to put in a calendar. */
export interface CalendarSession {
  /** Local day key. */
  readonly on: string
  readonly title: string
  readonly description?: string
}

export interface CalendarTimes {
  /** Local start, `HH:MM`. */
  readonly start: string
  readonly minutes: number
}

/**
 * Sessions as an iCalendar file (RFC 5545) a phone's calendar imports.
 *
 * **Floating times** — `DTSTART:20261005T180000` with no zone — because a
 * session is at six in the evening wherever the lifter is that week, not
 * at a fixed instant somewhere. **A UID per day** (`2026-10-05@liftos`),
 * so importing the file again updates the events rather than doubling
 * them. Text is escaped and lines folded at 75 characters, the two rules
 * that make a strict calendar refuse a file a lax one accepts. `stamp` is
 * the export instant in UTC, `YYYYMMDDTHHMMSSZ`, taken as a parameter so
 * the file is a pure function of its inputs.
 */
export function calendarFile(
  sessions: readonly CalendarSession[],
  times: CalendarTimes,
  stamp: string,
): string {
  const [hour = 0, minute = 0] = times.start.split(':').map(Number)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LiftOS//Training//EN',
    'CALSCALE:GREGORIAN',
    ...sessions.flatMap((session) => {
      const startMinutes = hour * 60 + minute
      const endMinutes = startMinutes + Math.max(1, times.minutes)
      return [
        'BEGIN:VEVENT',
        `UID:${session.on}@liftos`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dateTime(session.on, startMinutes)}`,
        `DTEND:${dateTime(session.on, endMinutes)}`,
        `SUMMARY:${escapeText(session.title)}`,
        ...(session.description === undefined
          ? []
          : [`DESCRIPTION:${escapeText(session.description)}`]),
        'END:VEVENT',
      ]
    }),
    'END:VCALENDAR',
  ]
  return `${lines.flatMap(fold).join('\r\n')}\r\n`
}

/** A day key and minutes from its midnight as `YYYYMMDDTHHMMSS`; past midnight runs to the next day. */
function dateTime(day: string, minutes: number): string {
  const extraDays = Math.floor(minutes / 1440)
  const within = minutes % 1440
  const key = shiftDay(day, extraDays).replace(/-/g, '')
  return `${key}T${pad(Math.floor(within / 60))}${pad(within % 60)}00`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Lines longer than 75 characters continue on the next, which starts with a space. */
function fold(line: string): string[] {
  if (line.length <= 75) return [line]
  const parts = [line.slice(0, 75)]
  for (let at = 75; at < line.length; at += 74) parts.push(` ${line.slice(at, at + 74)}`)
  return parts
}
