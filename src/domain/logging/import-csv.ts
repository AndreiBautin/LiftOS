import type { Exercise } from '@/domain/exercises/exercise'
import { shiftDay } from '@/domain/time/day'
import type { WeightUnit } from '@/domain/units/weight'

/** One set as another app exported it. */
export interface ImportedSet {
  readonly load?: number
  readonly reps?: number
  readonly warmup: boolean
}

export interface ImportedEntry {
  /** The exercise's name in the other app, the key a mapping is made on. */
  readonly name: string
  readonly sets: readonly ImportedSet[]
  readonly notes?: string
}

export interface ImportedSession {
  /** Local day key. */
  readonly date: string
  /** Local date-time, no zone: `2024-01-15T18:30:00`. */
  readonly startedAt: string
  readonly completedAt?: string
  readonly title: string
  readonly entries: readonly ImportedEntry[]
}

export interface ImportedExport {
  readonly source: 'strong' | 'hevy'
  /** The unit the loads are in, when the file says; Strong's never does. */
  readonly units?: WeightUnit
  readonly sessions: readonly ImportedSession[]
}

/**
 * A training export from another app, read into sessions.
 *
 * **Two formats, told apart by their headers**: Strong's (`Date`,
 * `Exercise Name`, `Set Order`, `Weight`, `Reps`) and Hevy's
 * (`start_time`, `exercise_title`, `set_type`, `weight_lbs` or
 * `weight_kg`, `reps`). Hevy names its unit in the column; Strong does
 * not, so the screen asks. Warm-ups come across marked as warm-ups —
 * Strong's `W` set order, Hevy's `warmup` set type — so they stay out of
 * volume here as they do for sets logged in this app. **Parsed, never
 * guessed**: a file in neither format is refused with the reason, rather
 * than half-read into sessions that look plausible.
 */
export function readTrainingExport(text: string): ImportedExport | { readonly error: string } {
  const rows = parseCsv(text)
  const header = rows[0]
  if (header === undefined) return { error: 'The file is empty.' }
  const column = (name: string) => header.findIndex((cell) => cell.trim().toLowerCase() === name)
  if (column('exercise name') !== -1 && column('date') !== -1) return readStrong(rows, column)
  if (column('exercise_title') !== -1 && column('start_time') !== -1) return readHevy(rows, column)
  return { error: 'This is not a Strong or Hevy export — its columns are not ones either writes.' }
}

type Column = (name: string) => number

function readStrong(rows: readonly string[][], column: Column): ImportedExport {
  const at = {
    date: column('date'),
    title: column('workout name'),
    duration: column('duration'),
    exercise: column('exercise name'),
    order: column('set order'),
    weight: column('weight'),
    reps: column('reps'),
    notes: column('notes'),
  }
  return {
    source: 'strong',
    sessions: group(rows.slice(1), (row) => {
      const stamp = (row[at.date] ?? '').trim()
      const startedAt = stamp.replace(' ', 'T')
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(startedAt)) return undefined
      const minutes = durationMinutes(row[at.duration] ?? '')
      return {
        key: `${stamp}|${row[at.title] ?? ''}`,
        date: startedAt.slice(0, 10),
        startedAt: withSeconds(startedAt),
        ...(minutes === undefined
          ? {}
          : { completedAt: addMinutes(withSeconds(startedAt), minutes) }),
        title: (row[at.title] ?? '').trim() || 'Imported session',
        exercise: (row[at.exercise] ?? '').trim(),
        set: {
          ...numberField('load', row[at.weight]),
          ...numberField('reps', row[at.reps]),
          warmup: (row[at.order] ?? '').trim().toUpperCase() === 'W',
        },
        notes: (row[at.notes] ?? '').trim(),
      }
    }),
  }
}

function readHevy(rows: readonly string[][], column: Column): ImportedExport {
  const kg = column('weight_kg')
  const at = {
    title: column('title'),
    start: column('start_time'),
    end: column('end_time'),
    exercise: column('exercise_title'),
    type: column('set_type'),
    weight: kg !== -1 ? kg : column('weight_lbs'),
    reps: column('reps'),
    notes: column('exercise_notes'),
  }
  return {
    source: 'hevy',
    units: kg !== -1 ? 'kg' : 'lb',
    sessions: group(rows.slice(1), (row) => {
      const startedAt = hevyTime(row[at.start] ?? '')
      if (startedAt === undefined) return undefined
      const completedAt = hevyTime(row[at.end] ?? '')
      return {
        key: `${row[at.start] ?? ''}|${row[at.title] ?? ''}`,
        date: startedAt.slice(0, 10),
        startedAt,
        ...(completedAt === undefined ? {} : { completedAt }),
        title: (row[at.title] ?? '').trim() || 'Imported session',
        exercise: (row[at.exercise] ?? '').trim(),
        set: {
          ...numberField('load', row[at.weight]),
          ...numberField('reps', row[at.reps]),
          warmup: (row[at.type] ?? '').trim().toLowerCase() === 'warmup',
        },
        notes: (row[at.notes] ?? '').trim(),
      }
    }),
  }
}

interface Row {
  readonly key: string
  readonly date: string
  readonly startedAt: string
  readonly completedAt?: string
  readonly title: string
  readonly exercise: string
  readonly set: ImportedSet
  readonly notes: string
}

/** Rows into sessions, and each session's rows into entries in the order first met. */
function group(rows: readonly string[][], read: (row: readonly string[]) => Row | undefined) {
  const sessions = new Map<
    string,
    { head: Row; entries: Map<string, ImportedSet[]>; notes: Map<string, string> }
  >()
  for (const raw of rows) {
    const row = read(raw)
    if (row === undefined || row.exercise === '') continue
    const session = sessions.get(row.key) ?? {
      head: row,
      entries: new Map<string, ImportedSet[]>(),
      notes: new Map<string, string>(),
    }
    session.entries.set(row.exercise, [...(session.entries.get(row.exercise) ?? []), row.set])
    if (row.notes !== '' && !session.notes.has(row.exercise))
      session.notes.set(row.exercise, row.notes)
    sessions.set(row.key, session)
  }
  return [...sessions.values()]
    .map(({ head, entries, notes }) => ({
      date: head.date,
      startedAt: head.startedAt,
      ...(head.completedAt === undefined ? {} : { completedAt: head.completedAt }),
      title: head.title,
      entries: [...entries.entries()].map(([name, sets]) => {
        const note = notes.get(name)
        return { name, sets, ...(note === undefined ? {} : { notes: note }) }
      }),
    }))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Hevy writes `15 Jan 2024, 18:30`; read as a local date-time. */
function hevyTime(text: string): string | undefined {
  const match = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})$/.exec(text.trim())
  if (match === null) return undefined
  const [, day = '', month = '', year = '', hour = '', minute = ''] = match
  const index = MONTHS.indexOf(month.toLowerCase())
  if (index === -1) return undefined
  return `${year}-${String(index + 1).padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00`
}

/** Strong writes `1h 5m`, `45m` or `30s`. */
function durationMinutes(text: string): number | undefined {
  const hours = /(\d+)\s*h/.exec(text)?.[1]
  const minutes = /(\d+)\s*m/.exec(text)?.[1]
  if (hours === undefined && minutes === undefined) return undefined
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0)
}

function withSeconds(stamp: string): string {
  return stamp.length === 16 ? `${stamp}:00` : stamp
}

/** Adds minutes to a local date-time by calendar arithmetic, no zone involved. */
function addMinutes(stamp: string, minutes: number): string {
  const [day = '', time = ''] = stamp.split('T')
  const [hour = 0, minute = 0, second = 0] = time.split(':').map(Number)
  const total = hour * 60 + minute + minutes
  const dayShift = Math.floor(total / 1440)
  const within = total % 1440
  const key = shiftDay(day, dayShift)
  return `${key}T${String(Math.floor(within / 60)).padStart(2, '0')}:${String(within % 60).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

function numberField<K extends 'load' | 'reps'>(
  key: K,
  text: string | undefined,
): Partial<Record<K, number>> {
  const value = Number((text ?? '').trim())
  return (text ?? '').trim() !== '' && Number.isFinite(value) && value > 0
    ? ({ [key]: value } as Partial<Record<K, number>>)
    : {}
}

/** RFC 4180: quoted cells, doubled quotes, line breaks inside quotes, a BOM, and `;` files. */
export function parseCsv(text: string): string[][] {
  const body = text.replace(/^\uFEFF/, '')
  const firstLine = body.slice(0, body.search(/\r?\n/) === -1 ? undefined : body.search(/\r?\n/))
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let at = 0; at < body.length; at += 1) {
    const char = body.charAt(at)
    if (quoted) {
      if (char === '"' && body[at + 1] === '"') {
        cell += '"'
        at += 1
      } else if (char === '"') quoted = false
      else cell += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && body[at + 1] === '\n') at += 1
      row.push(cell)
      if (row.some((one) => one !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  row.push(cell)
  if (row.some((one) => one !== '')) rows.push(row)
  return rows
}

/**
 * The library exercise another app's name most likely means, or nothing.
 *
 * Strong writes `Bench Press (Barbell)` and Hevy `Bench Press (Barbell)`
 * too; the parenthesis is equipment. So the words outside it are compared
 * as sets (overlap over union), the equipment breaks ties, and anything
 * under two thirds is no match — **a wrong guess files months of sets
 * under the wrong lift**, where no guess asks the lifter once.
 */
export function matchExercise(name: string, library: readonly Exercise[]): Exercise | undefined {
  const { words, equipment } = tokens(name)
  if (words.size === 0) return undefined
  let best: { exercise: Exercise; score: number } | undefined
  for (const exercise of library) {
    if (exercise.isArchived) continue
    const theirs = tokens(exercise.name)
    const shared = [...words].filter((word) => theirs.words.has(word)).length
    const union = new Set([...words, ...theirs.words]).size
    let score = union === 0 ? 0 : shared / union
    if (equipment !== undefined && exercise.equipment.replace('-', ' ') === equipment) score += 0.1
    if (best === undefined || score > best.score) best = { exercise, score }
  }
  return best !== undefined && best.score >= 2 / 3 ? best.exercise : undefined
}

const DROPPED = new Set(['the', 'a', 'of', 'barbell', 'dumbbell'])

function tokens(name: string): { words: Set<string>; equipment?: string } {
  const lower = name.toLowerCase()
  const equipment = /\(([^)]*)\)/.exec(lower)?.[1]?.trim()
  const words = new Set(
    lower
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .map((word) => (word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word))
      .filter((word) => word !== '' && !DROPPED.has(word)),
  )
  return { words, ...(equipment === undefined ? {} : { equipment }) }
}
