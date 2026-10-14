/**
 * Dates and times as words, through formatters built once.
 *
 * `toLocaleDateString(locale, options)` builds a fresh `Intl.DateTimeFormat`
 * on every call — measured at a quarter of a millisecond each, against
 * about two microseconds for a formatter that already exists. That is
 * nothing once and a great deal in a list: the training grid called it for
 * every cell and took longer to render than the other fifteen cards on
 * Today together. A lint rule sends every call through here.
 *
 * The defaults match the methods they replace, so a call moved here reads
 * exactly as it did: `formatDate` adds the year, month and day unless a
 * date part is named, and `formatTime` adds the hour, minute and second
 * unless a time part is — whatever else the options name.
 */
const formatters = new Map<string, Intl.DateTimeFormat>()

const DATE_PARTS = ['weekday', 'era', 'year', 'month', 'day', 'dateStyle'] as const
const TIME_PARTS = [
  'dayPeriod',
  'hour',
  'minute',
  'second',
  'fractionalSecondDigits',
  'timeStyle',
] as const

function formatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = JSON.stringify([locale ?? '', options])
  let held = formatters.get(key)
  if (held === undefined) {
    held = new Intl.DateTimeFormat(locale, options)
    formatters.set(key, held)
  }
  return held
}

function names(options: Intl.DateTimeFormatOptions, parts: readonly string[]): boolean {
  return parts.some((part) => part in options)
}

/** `date.toLocaleDateString(locale, options)`, without the cost. */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale?: string,
): string {
  const full = names(options, DATE_PARTS)
    ? options
    : { ...options, year: 'numeric' as const, month: 'numeric' as const, day: 'numeric' as const }
  return formatter(locale, full).format(date)
}

/** `date.toLocaleTimeString(locale, options)`, without the cost. */
export function formatTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale?: string,
): string {
  const full = names(options, TIME_PARTS)
    ? options
    : {
        ...options,
        hour: 'numeric' as const,
        minute: 'numeric' as const,
        second: 'numeric' as const,
      }
  return formatter(locale, full).format(date)
}
