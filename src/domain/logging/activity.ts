import { parseDay } from '@/domain/time/day'

/**
 * Casual training, recorded as what was actually said — not a session.
 *
 * Asked for directly: _"casual pushups/curls/lateral raises should be valid
 * activity, not failed strict bodybuilding sessions"_. A {@link WorkoutLog}
 * is a session against a plan, with every planned set pending until it is
 * done, so twenty push-ups between meetings filed as one would read as a
 * session with everything else skipped. An activity is a separate record
 * with no plan behind it, and so nothing it can fall short of.
 *
 * **Only what was reported.** The two shapes are the two things a person
 * says: a day's total ("100 curls today") or the sets themselves ("three
 * sets of 12 at 25"). A total is never split into invented sets, a set
 * never gains a load or an effort nobody gave, and **"100 total" is not
 * "100 per arm"** — `per` says which was said, and nothing converts one
 * into the other.
 *
 * **The id is the event id.** Whoever records it — this device, or Jarvis
 * on the user's word — chooses it once, so a retried delivery lands on the
 * same record instead of logging the work twice.
 */
export type ActivityId = string & { readonly __brand: 'ActivityId' }
export const asActivityId = (value: string): ActivityId => value as ActivityId

/** Reps counted across both sides, or on each side. */
export type RepScope = 'total' | 'per-side'

interface ActivitySet {
  readonly reps: number
  /** Absent when no load was said — not zero, which would be a claim. */
  readonly load?: number
}

export type ActivityAmount =
  | { readonly kind: 'total'; readonly reps: number; readonly per: RepScope }
  | { readonly kind: 'sets'; readonly sets: readonly ActivitySet[]; readonly per: RepScope }
  | { readonly kind: 'minutes'; readonly minutes: number }

/** Who put it here: a tap on this app, or Jarvis on the user's own word. */
export type ActivitySource = 'app' | 'jarvis'

export interface ActivityEntry {
  readonly id: ActivityId
  /** The user's local calendar day, never derived from a server clock. */
  readonly day: string
  /** As the user named it. */
  readonly exercise: string
  readonly amount: ActivityAmount
  /** The unit any load was said in; never converted. */
  readonly unit?: 'lb' | 'kg'
  readonly source: ActivitySource
  readonly note?: string
  readonly createdAt: string
  readonly updatedAt?: string
}

const ACTIVITY_LIMITS = {
  exercise: 60,
  note: 200,
  reps: 5000,
  sets: 50,
  load: 2000,
  minutes: 600,
  id: 80,
} as const

const ID = /^[A-Za-z0-9_.:-]{6,80}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

function isoInstant(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))
}

function wholeIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function loadIn(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= ACTIVITY_LIMITS.load &&
    Math.round(value * 100) === value * 100
  )
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is refused
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return text.length >= 1 && text.length <= max ? text : undefined
}

function amountOf(value: unknown): ActivityAmount | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const bag = value as Record<string, unknown>
  const per = bag.per === 'total' || bag.per === 'per-side' ? bag.per : undefined
  if (bag.kind === 'total') {
    if (per === undefined || !wholeIn(bag.reps, 1, ACTIVITY_LIMITS.reps)) return undefined
    return { kind: 'total', reps: bag.reps, per }
  }
  if (bag.kind === 'sets') {
    if (per === undefined || !Array.isArray(bag.sets)) return undefined
    const raw: readonly unknown[] = bag.sets
    if (raw.length < 1 || raw.length > ACTIVITY_LIMITS.sets) return undefined
    const sets: ActivitySet[] = []
    for (const one of raw) {
      if (typeof one !== 'object' || one === null) return undefined
      const set = one as Record<string, unknown>
      if (!wholeIn(set.reps, 1, ACTIVITY_LIMITS.reps)) return undefined
      if (set.load !== undefined && !loadIn(set.load)) return undefined
      sets.push(set.load === undefined ? { reps: set.reps } : { reps: set.reps, load: set.load })
    }
    return { kind: 'sets', sets, per }
  }
  if (bag.kind === 'minutes') {
    if (!wholeIn(bag.minutes, 1, ACTIVITY_LIMITS.minutes)) return undefined
    return { kind: 'minutes', minutes: bag.minutes }
  }
  return undefined
}

/**
 * Reads an activity from anywhere outside this device's own store — a
 * backup, the sync file, Jarvis's inbox — as untrusted input.
 *
 * Total: anything not exactly an activity is `undefined`, never repaired
 * into one. A set with a load needs the unit it was said in.
 */
export function parseActivity(candidate: unknown): ActivityEntry | undefined {
  if (typeof candidate !== 'object' || candidate === null) return undefined
  const bag = candidate as Record<string, unknown>
  if (typeof bag.id !== 'string' || !ID.test(bag.id)) return undefined
  if (typeof bag.day !== 'string' || !DAY.test(bag.day) || !validDay(bag.day)) return undefined
  const exercise = cleanText(bag.exercise, ACTIVITY_LIMITS.exercise)
  if (exercise === undefined) return undefined
  const amount = amountOf(bag.amount)
  if (amount === undefined) return undefined
  const unit = bag.unit === 'lb' || bag.unit === 'kg' ? bag.unit : undefined
  if (bag.unit !== undefined && unit === undefined) return undefined
  const loaded = amount.kind === 'sets' && amount.sets.some((set) => set.load !== undefined)
  if (loaded && unit === undefined) return undefined
  if (bag.source !== 'app' && bag.source !== 'jarvis') return undefined
  if (!isoInstant(bag.createdAt)) return undefined
  if (bag.updatedAt !== undefined && !isoInstant(bag.updatedAt)) return undefined
  const note = bag.note === undefined ? undefined : cleanText(bag.note, ACTIVITY_LIMITS.note)
  if (bag.note !== undefined && note === undefined) return undefined

  return {
    id: asActivityId(bag.id),
    day: bag.day,
    exercise,
    amount,
    ...(unit === undefined ? {} : { unit }),
    source: bag.source,
    ...(note === undefined ? {} : { note }),
    createdAt: bag.createdAt,
    ...(bag.updatedAt === undefined ? {} : { updatedAt: bag.updatedAt }),
  }
}

function validDay(day: string): boolean {
  // `parseDay` reads the key as UTC midnight, so its UTC fields round-trip.
  const parsed = parseDay(day)
  if (Number.isNaN(parsed.getTime())) return false
  const [year, month, date] = day.split('-').map(Number)
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === date
  )
}

/**
 * Reps the record actually states, with the scope they were said in.
 *
 * A set list sums its own reps; a total is itself; minutes have no reps.
 * Never adds a per-side figure to a total one — they are different
 * quantities, and the caller has to say which it wants.
 */
export function statedReps(entry: ActivityEntry): { reps: number; per: RepScope } | undefined {
  const { amount } = entry
  if (amount.kind === 'minutes') return undefined
  if (amount.kind === 'total') return { reps: amount.reps, per: amount.per }
  return { reps: amount.sets.reduce((sum, set) => sum + set.reps, 0), per: amount.per }
}

/** Plain words for one record, from its own fields only. */
export function describeActivity(entry: ActivityEntry): string {
  const { amount } = entry
  if (amount.kind === 'minutes') return `${entry.exercise} · ${String(amount.minutes)} min`
  const side = amount.per === 'per-side' ? ' per side' : ' total'
  if (amount.kind === 'total') {
    return `${entry.exercise} · ${String(amount.reps)} reps${side}`
  }
  const sets = amount.sets
    .map((set) =>
      set.load === undefined
        ? String(set.reps)
        : `${String(set.reps)}×${String(set.load)}${entry.unit ?? ''}`,
    )
    .join(', ')
  const count = amount.sets.length
  return `${entry.exercise} · ${String(count)} ${count === 1 ? 'set' : 'sets'}${side} (${sets})`
}

interface ExerciseTally {
  readonly exercise: string
  /** Reps said as totals across both sides. */
  readonly totalReps: number
  /** Reps said per side, kept apart — never added to `totalReps`. */
  readonly perSideReps: number
  /** Sets actually reported; a day total contributes none. */
  readonly reportedSets: number
  readonly minutes: number
  readonly entries: number
}

/**
 * What a run of days held, per exercise, as stated.
 *
 * Names are matched case- and space-insensitively and shown as first
 * written. No set count is inferred from a total, which is why a tally of
 * totals alone reports zero sets: it cannot support a set-based dose.
 */
export function tallyActivities(
  entries: readonly ActivityEntry[],
  from: string,
  to: string,
): readonly ExerciseTally[] {
  const byName = new Map<string, ExerciseTally>()
  for (const entry of entries) {
    if (entry.day < from || entry.day > to) continue
    const key = entry.exercise.toLowerCase().replace(/\s+/g, ' ')
    const held = byName.get(key) ?? {
      exercise: entry.exercise,
      totalReps: 0,
      perSideReps: 0,
      reportedSets: 0,
      minutes: 0,
      entries: 0,
    }
    const { amount } = entry
    const reps = statedReps(entry)
    byName.set(key, {
      ...held,
      totalReps: held.totalReps + (reps?.per === 'total' ? reps.reps : 0),
      perSideReps: held.perSideReps + (reps?.per === 'per-side' ? reps.reps : 0),
      reportedSets: held.reportedSets + (amount.kind === 'sets' ? amount.sets.length : 0),
      minutes: held.minutes + (amount.kind === 'minutes' ? amount.minutes : 0),
      entries: held.entries + 1,
    })
  }
  return [...byName.values()].sort((a, b) => a.exercise.localeCompare(b.exercise))
}

/** Newest day first, then newest written. */
export function newestFirst(a: ActivityEntry, b: ActivityEntry): number {
  if (a.day !== b.day) return b.day.localeCompare(a.day)
  return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
}

/**
 * Exercise names this device has actually logged, newest first, once each.
 *
 * The quick choices on Today. Only records count: an empty log offers no
 * choice at all rather than a made-up list that reads as history.
 */
export function recentExercises(entries: readonly ActivityEntry[], limit: number): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const entry of [...entries].sort(newestFirst)) {
    const key = entry.exercise.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) continue
    seen.add(key)
    names.push(entry.exercise)
    if (names.length >= limit) break
  }
  return names
}

/** What the quick-log form holds, as typed. Every field but reps may be blank. */
interface QuickFields {
  readonly reps: string
  readonly sets: string
  readonly load: string
  readonly per: RepScope
}

type QuickAmount =
  | { readonly ok: true; readonly amount: ActivityAmount; readonly loaded: boolean }
  | { readonly ok: false; readonly reason: 'reps' | 'sets' | 'load' | 'load-needs-sets' }

/**
 * Turns the quick-log form into exactly what was said, or a reason not to.
 *
 * Reps alone is a day total ("100 curls"). Sets with reps is that many sets
 * of those reps ("3 × 12"), each carrying the load only when one was typed.
 * A load without a set count is refused rather than filed as one invented
 * set: the record would claim a set nobody reported.
 */
export function quickAmount(fields: QuickFields): QuickAmount {
  const reps = wholeFrom(fields.reps)
  if (reps === undefined || reps < 1 || reps > ACTIVITY_LIMITS.reps) {
    return { ok: false, reason: 'reps' }
  }
  const setsText = fields.sets.trim()
  const loadText = fields.load.trim()
  const sets = setsText === '' ? undefined : wholeFrom(setsText)
  if (setsText !== '' && (sets === undefined || sets < 1 || sets > ACTIVITY_LIMITS.sets)) {
    return { ok: false, reason: 'sets' }
  }
  const load = loadText === '' ? undefined : Number(loadText)
  if (load !== undefined && !loadIn(load)) return { ok: false, reason: 'load' }
  if (sets === undefined) {
    if (load !== undefined) return { ok: false, reason: 'load-needs-sets' }
    return { ok: true, amount: { kind: 'total', reps, per: fields.per }, loaded: false }
  }
  const one = load === undefined ? { reps } : { reps, load }
  return {
    ok: true,
    amount: { kind: 'sets', sets: Array.from({ length: sets }, () => one), per: fields.per },
    loaded: load !== undefined,
  }
}

function wholeFrom(text: string): number | undefined {
  const trimmed = text.trim()
  if (!/^\d{1,5}$/.test(trimmed)) return undefined
  return Number(trimmed)
}
