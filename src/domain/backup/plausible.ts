/**
 * Whether a record read from a file has the shape the app relies on.
 *
 * A backup, and the sync file, arrive from outside: the sync file lives
 * in a repository anyone with write access can edit. The envelope is
 * checked (magic, schema, checksum) but its records were taken on trust,
 * so a workout whose `entries` was not a list merged in, synced to every
 * device, and broke the screens that read it — on all of them. These
 * check the fields screens dereference, read from `unknown`; a record
 * that fails is left out of the import rather than refusing the file,
 * so one bad row does not cost the good ones.
 *
 * Deliberately not a full schema. Optional fields the screens already
 * treat as maybe-absent are not checked, and a check here that rejects
 * a record the app itself wrote would be a data-loss bug — `backup-
 * service.test.ts` round-trips real records through these to hold that.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/
const STATUSES: readonly unknown[] = ['in-progress', 'completed', 'abandoned']
const OUTCOMES: readonly unknown[] = ['pending', 'completed', 'skipped', 'failed']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isText = (value: unknown): value is string => typeof value === 'string' && value !== ''
const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value))

function isPlausibleSet(value: unknown): boolean {
  return (
    isObject(value) &&
    OUTCOMES.includes(value.outcome) &&
    isObject(value.prescription) &&
    isOptionalNumber(value.actualLoad) &&
    isOptionalNumber(value.actualReps) &&
    isOptionalNumber(value.plannedLoad) &&
    isOptionalNumber(value.plannedReps)
  )
}

function isPlausibleEntry(value: unknown): boolean {
  return (
    isObject(value) &&
    isText(value.exerciseId) &&
    typeof value.role === 'string' &&
    typeof value.order === 'number' &&
    Array.isArray(value.sets) &&
    value.sets.every(isPlausibleSet)
  )
}

export function isPlausibleWorkout(value: unknown): boolean {
  return (
    isObject(value) &&
    isText(value.id) &&
    typeof value.date === 'string' &&
    DAY.test(value.date) &&
    typeof value.startedAt === 'string' &&
    STATUSES.includes(value.status) &&
    typeof value.title === 'string' &&
    Array.isArray(value.entries) &&
    value.entries.every(isPlausibleEntry)
  )
}

export function isPlausibleExercise(value: unknown): boolean {
  return (
    isObject(value) &&
    isText(value.id) &&
    typeof value.name === 'string' &&
    typeof value.primaryMuscle === 'string'
  )
}
