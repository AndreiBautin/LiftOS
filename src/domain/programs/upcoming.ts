import type { Exercise } from '@/domain/exercises/exercise'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { shiftDay } from '@/domain/time/day'

import type { ProgramTemplate, Slot } from './program'
import { sessionOn, type DayMoves } from './schedule'

/**
 * The sessions the calendar holds from today on, in the shape another app
 * can read without knowing how a programme is built.
 *
 * It rides in the sync file beside `position`, because a reader of that
 * file sees only finished workouts and a cursor: what today's session *is*
 * lives in the programme, which only this app can derive. Read through
 * `sessionOn`, so a moved session is where the hero says it is.
 */
export interface UpcomingSession {
  readonly date: string
  readonly title: string
  readonly focus?: string
  readonly exercises: readonly UpcomingExercise[]
}

/** `load` and `reps` are the first working set's, and only on today's session. */
export interface UpcomingExercise {
  readonly name: string
  readonly sets: number
  readonly load?: number
  readonly reps?: number
}

export const UPCOMING_DAYS = 7

function slotName(slot: Slot, exercises: ReadonlyMap<string, Exercise>): string {
  return slot.exercise.kind === 'query'
    ? slot.exercise.label
    : (exercises.get(slot.exercise.exerciseId)?.name ?? 'Exercise')
}

export function upcomingSessions(
  program: ProgramTemplate,
  blockStartedOn: string,
  today: string,
  exercises: readonly Exercise[],
  moves?: DayMoves,
): readonly UpcomingSession[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id as string, exercise]))
  return Array.from({ length: UPCOMING_DAYS }, (_, offset) => shiftDay(today, offset)).flatMap(
    (on) => {
      const day = sessionOn(program, blockStartedOn, on, moves)?.day
      if (day === undefined) return []
      return [
        {
          date: on,
          title: day.label,
          ...(day.focus === undefined ? {} : { focus: day.focus }),
          exercises: day.slots
            .map((slot) => ({
              name: slotName(slot, byId),
              sets: slot.sets.filter((set) => set.isWarmup !== true).length,
            }))
            .filter((entry) => entry.sets > 0),
        },
      ]
    },
  )
}

/**
 * Today's session as Start would open it: the preview's exercises, with
 * the loads and reps it planned from history, replace the programme's
 * outline. Only today's — a later day's loads depend on today's lifting,
 * so promising them would be a number that moves.
 */
export function withTodaysPlan(
  sessions: readonly UpcomingSession[],
  today: string,
  preview: WorkoutLog,
  exercises: readonly Exercise[],
): readonly UpcomingSession[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id as string, exercise]))
  return sessions.map((session) => {
    if (session.date !== today) return session
    return {
      ...session,
      exercises: preview.entries.flatMap((entry) => {
        const working = entry.sets.filter((set) => !set.isWarmup)
        const first = working[0]
        if (first === undefined) return []
        return [
          {
            name: byId.get(entry.exerciseId)?.name ?? 'Exercise',
            sets: working.length,
            ...(first.plannedLoad === undefined ? {} : { load: first.plannedLoad }),
            ...(first.plannedReps === undefined ? {} : { reps: first.plannedReps }),
          },
        ]
      }),
    }
  })
}
