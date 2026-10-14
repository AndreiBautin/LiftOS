import type { WorkoutLog } from './workout-log'

/**
 * Every set ever logged as CSV, a row a set, for a spreadsheet.
 *
 * **Not the backup and must not become one.** The backup is the whole
 * database with a checksum, made to be read back in; this is one flat
 * table made to be read by something else, and nothing imports it. Oldest
 * first, the way a spreadsheet's rows are read. Skipped and pending sets
 * are included with their outcome, so the file says what the log says.
 */
const HEADER = [
  'date',
  'session',
  'status',
  'exercise',
  'version',
  'set',
  'warm-up',
  'outcome',
  'load',
  'reps',
  'note',
]

export function setsCsv(
  logs: readonly WorkoutLog[],
  nameOf: (exerciseId: string) => string,
): string {
  const rows = logs
    .filter((log) => log.status !== 'in-progress')
    .toSorted((a, b) => a.startedAt.localeCompare(b.startedAt))
    .flatMap((log) =>
      log.entries.flatMap((entry) =>
        entry.sets.map((set, index) => [
          log.date,
          log.title,
          log.status,
          nameOf(entry.exerciseId),
          entry.variant ?? '',
          String(index + 1),
          set.isWarmup ? 'yes' : '',
          set.outcome,
          set.actualLoad === undefined ? '' : String(set.actualLoad),
          set.actualReps === undefined ? '' : String(set.actualReps),
          set.notes ?? '',
        ]),
      ),
    )
  return [HEADER, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

/**
 * Quoted when it holds a comma, a quote or a line break; quotes doubled.
 *
 * **A cell a spreadsheet would run as a formula is defused first.** Text
 * starting with `=`, `+`, `-`, `@`, a tab or a carriage return is read by
 * Excel, Sheets and Numbers as a formula, and the notes and exercise
 * names here are free text — typed, dictated, imported from another app
 * or arriving through the sync file. A leading apostrophe makes the
 * spreadsheet show the text as text. A number is left alone, so a load
 * of -5 (never written, but legal) still reads as a number.
 */
function cell(value: string): string {
  const safe = FORMULA.test(value) && !NUMBER.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const FORMULA = /^[=+\-@\t\r]/
const NUMBER = /^-?\d+(\.\d+)?$/
