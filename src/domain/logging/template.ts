import type { ExerciseId } from '@/domain/ids/ids'
import type { SetPrescription } from '@/domain/programs/prescription'
import type { SlotRole } from '@/domain/programs/program'

import type { LogEntry, WorkoutLog } from './workout-log'

/**
 * A session kept by name to be run again: its exercises in order, each
 * with its sets as prescribed — **the shape, never the results.** A
 * template started in a month opens at that month's loads, each planned
 * from the exercise's own history the way Repeat and Start plan them, so
 * a template never carries a weight that has gone stale.
 *
 * A **copy** rather than a pointer to the session it came from: deleting
 * that session from history must not take the template with it, and a
 * template is a statement about what to do next, which history is not.
 */
export interface TemplateSet {
  readonly prescription: SetPrescription
  readonly isWarmup: boolean
}

export interface TemplateEntry {
  readonly exerciseId: ExerciseId
  readonly role: SlotRole
  readonly variant?: string
  readonly superset?: string
  readonly sets: readonly TemplateSet[]
}

export interface SessionTemplate {
  readonly id: string
  readonly name: string
  readonly createdAt: string
  readonly entries: readonly TemplateEntry[]
}

/** The longest name kept; a template is a label on a button. */
export const TEMPLATE_NAME_LIMIT = 40

/**
 * A session's shape as a template. **What was done**, not what was
 * planned: an exercise swapped in is kept under the exercise that was
 * lifted, and an entry every set of which was skipped is left out —
 * skipping it is the session saying it was not really part of the day.
 */
export function templateFrom(
  workout: WorkoutLog,
  name: string,
  id: string,
  at: string,
): SessionTemplate {
  const entries = workout.entries
    .filter((entry) => entry.sets.length > 0 && entry.sets.some((set) => set.outcome !== 'skipped'))
    .map((entry): TemplateEntry => ({
      exerciseId: entry.exerciseId,
      role: entry.role,
      ...(entry.variant !== undefined ? { variant: entry.variant } : {}),
      ...(entry.superset !== undefined ? { superset: entry.superset } : {}),
      sets: entry.sets.map((set) => ({
        prescription: set.prescription,
        isWarmup: set.isWarmup,
      })),
    }))
  const trimmed = name.trim().slice(0, TEMPLATE_NAME_LIMIT)
  return { id, name: trimmed === '' ? workout.title : trimmed, createdAt: at, entries }
}

/** A template's entries as an unstarted session's: every set pending. */
export function entriesFromTemplate(template: SessionTemplate): LogEntry[] {
  return template.entries.map((entry, order) => ({
    exerciseId: entry.exerciseId,
    role: entry.role,
    order,
    ...(entry.variant !== undefined ? { variant: entry.variant } : {}),
    ...(entry.superset !== undefined ? { superset: entry.superset } : {}),
    sets: entry.sets.map((set) => ({
      prescription: set.prescription,
      isWarmup: set.isWarmup,
      outcome: 'pending' as const,
    })),
  }))
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * A stored template, read as `unknown`: it arrives from settings that may
 * have been written by another build or another device. A prescription is
 * checked for the shape every reader of it switches on — a load and a rep
 * target each naming a `kind` — rather than trusted; a template that fails
 * is dropped whole, because a half-read one would start a session with the
 * wrong exercises in it.
 */
export function isPlausibleTemplate(value: unknown): value is SessionTemplate {
  if (!isObject(value)) return false
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (typeof value.createdAt !== 'string' || !Array.isArray(value.entries)) return false
  return value.entries.every(
    (entry: unknown) =>
      isObject(entry) &&
      typeof entry.exerciseId === 'string' &&
      typeof entry.role === 'string' &&
      (entry.variant === undefined || typeof entry.variant === 'string') &&
      (entry.superset === undefined || typeof entry.superset === 'string') &&
      Array.isArray(entry.sets) &&
      entry.sets.length > 0 &&
      entry.sets.every(
        (set: unknown) =>
          isObject(set) &&
          typeof set.isWarmup === 'boolean' &&
          isObject(set.prescription) &&
          isObject(set.prescription.load) &&
          typeof set.prescription.load.kind === 'string' &&
          isObject(set.prescription.reps) &&
          typeof set.prescription.reps.kind === 'string',
      ),
  )
}
