import type { WorkoutId } from '@/domain/ids/ids'

import type { WorkoutLog } from './workout-log'

/**
 * Finding a session in a history of hundreds.
 *
 * **A search reads what a person remembers**: the day ("legs b"), an
 * exercise in it ("front squat" — only one actually done, not one
 * skipped), a word from a note ("knee"), or "records" for the sessions that
 * set one. Case and spacing do not matter; every word typed must match
 * somewhere, so "squat knee" narrows rather than widens. One field does all of
 * it, so there are no chips to go with it.
 */
const RECORD_WORDS: ReadonlySet<string> = new Set(['record', 'records', 'pr', 'prs'])

/** "Friday — Legs B" → "Legs B"; a title with no weekday is its own name. */
export function dayNameOf(title: string): string {
  const [, ...rest] = title.split(' — ')
  return rest.length === 0 ? title : rest.join(' — ')
}

export function filterHistory(
  logs: readonly WorkoutLog[],
  query: string,
  nameOf: (exerciseId: string) => string,
  recordCount: (id: WorkoutId) => number,
): readonly WorkoutLog[] {
  const typed = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '')
  const recordsOnly = typed.some((word) => RECORD_WORDS.has(word))
  const words = typed.filter((word) => !RECORD_WORDS.has(word))
  return logs.filter((log) => {
    if (recordsOnly && recordCount(log.id) === 0) return false
    if (words.length === 0) return true

    const haystack = [
      log.title,
      log.notes ?? '',
      ...log.entries.flatMap((entry) => [
        entry.sets.some((set) => !set.isWarmup && set.outcome === 'completed')
          ? nameOf(entry.exerciseId)
          : '',
        ...entry.sets.map((set) => set.notes ?? ''),
      ]),
    ]
      .join(' ')
      .toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}
