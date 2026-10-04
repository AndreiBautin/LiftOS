import type { Exercise } from '@/domain/exercises/exercise'
import type { MuscleGroup } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'
import { loggedVolume, type WorkoutLog } from '@/domain/logging/workout-log'
import { mondayOf, shiftDay } from '@/domain/time/day'

/** Calendar weeks a muscle page reads: this one and the eleven before. */
export const MUSCLE_WEEKS = 12

export interface MuscleExercise {
  readonly exerciseId: ExerciseId
  readonly sets: number
  readonly sessions: number
  readonly lastDay: string
}

export interface MuscleHistory {
  /** Working sets per calendar week, oldest first, this week last. */
  readonly weeks: readonly number[]
  readonly sets: number
  /** This muscle's sets over every muscle's, across the same weeks. */
  readonly share: number
  readonly lastDay?: string
  /** The exercises that paid it, most sets first. */
  readonly exercises: readonly MuscleExercise[]
}

/**
 * One muscle across twelve calendar weeks: its sets by week, its share of
 * all the sets, and which exercises did the work.
 *
 * **Counted by `loggedVolume`, entry by entry** — the rule the week card,
 * the balance and the body map count by — so a muscle page cannot credit
 * a set the radar does not. A set pays the muscle its exercise is for and
 * nothing else, which is why a bench press does not appear on Triceps.
 */
export function muscleHistory(
  logs: readonly WorkoutLog[],
  lookup: (id: ExerciseId) => Exercise | undefined,
  muscle: MuscleGroup,
  today: string,
): MuscleHistory {
  const first = shiftDay(mondayOf(today), -7 * (MUSCLE_WEEKS - 1))
  const weeks = Array<number>(MUSCLE_WEEKS).fill(0)
  const byExercise = new Map<ExerciseId, { sets: number; sessions: number; lastDay: string }>()
  let all = 0
  let lastDay: string | undefined

  for (const log of logs) {
    if (log.status !== 'completed' || log.date > today) continue
    const inWindow = log.date >= first
    if (inWindow) {
      const volume = loggedVolume(log, lookup)
      for (const sets of Object.values(volume)) all += sets
    }
    for (const entry of log.entries) {
      const sets = loggedVolume({ ...log, entries: [entry] }, lookup)[muscle]
      if (sets <= 0) continue
      if (lastDay === undefined || log.date > lastDay) lastDay = log.date
      if (!inWindow) continue
      const week = Math.round(
        (Date.parse(mondayOf(log.date)) - Date.parse(first)) / (7 * 86_400_000),
      )
      weeks[week] = (weeks[week] ?? 0) + sets
      const seen = byExercise.get(entry.exerciseId)
      byExercise.set(entry.exerciseId, {
        sets: (seen?.sets ?? 0) + sets,
        sessions: (seen?.sessions ?? 0) + 1,
        lastDay: seen === undefined || log.date > seen.lastDay ? log.date : seen.lastDay,
      })
    }
  }

  const sets = weeks.reduce((sum, week) => sum + week, 0)
  return {
    weeks,
    sets,
    share: all === 0 ? 0 : sets / all,
    ...(lastDay === undefined ? {} : { lastDay }),
    exercises: [...byExercise.entries()]
      .map(([exerciseId, one]) => ({ exerciseId, ...one }))
      .sort((a, b) => b.sets - a.sets || b.lastDay.localeCompare(a.lastDay)),
  }
}
