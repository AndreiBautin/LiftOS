import { defaultRepRange } from '@/domain/assembly/rp-assemble'
import type { ExerciseId, WorkoutId } from '@/domain/ids/ids'
import type { LogEntry, LoggedSet, WorkoutLog } from '@/domain/logging/workout-log'
import { plannedRepsFor, STRAIGHT_SETS } from '@/domain/programs/progression'
import type { LoadResets } from '@/domain/programs/stall'
import type { ExerciseRepository, WorkoutRepository } from '@/domain/repositories/ports'

import { planFromHistory } from './start-workout'

export interface AddExerciseDeps {
  readonly workouts: WorkoutRepository
  readonly exercises: ExerciseRepository
}

export interface AddExerciseRequest {
  readonly workoutId: WorkoutId
  /** The entry the new one goes after. */
  readonly afterIndex: number
  readonly exerciseId: ExerciseId
  readonly resets?: LoadResets
}

/**
 * Something the programme did not ask for, added to the open session:
 * an extra arm exercise on a day with time, a movement the lifter wants
 * to try.
 *
 * **It is planned the way the programme would plan it**: straight sets
 * in the range its kind runs in (`defaultRepRange`), at the load its own
 * history earns through `planFromHistory` — the function Start and the
 * swap use. With no history it opens with no weight, as any first
 * session does. It goes **after the exercise on screen**, so it is the
 * next thing to do rather than something to scroll to, and carries no
 * slot: nothing in the programme asked for it, and the log says so.
 */
export async function addExercise(
  request: AddExerciseRequest,
  deps: AddExerciseDeps,
): Promise<WorkoutLog> {
  const workout = await deps.workouts.byId(request.workoutId)
  if (workout?.status !== 'in-progress') throw new Error('No open session to add to.')
  const exercise = (await deps.exercises.all()).find((one) => one.id === request.exerciseId)
  if (exercise === undefined || exercise.isArchived) {
    throw new Error(`No exercise ${request.exerciseId}.`)
  }

  const range = defaultRepRange(exercise)
  const history = (await deps.workouts.forExercise(exercise.id, 10)).filter(
    (log) => log.id !== workout.id,
  )
  const plan = planFromHistory({
    exercise,
    variant: undefined,
    range,
    history,
    ...(request.resets !== undefined ? { resets: request.resets } : {}),
  })
  const plannedReps = plannedRepsFor(plan?.lastTime?.last, range, plan?.lastTime?.bumped ?? false)

  const sets: LoggedSet[] = Array.from({ length: STRAIGHT_SETS }, () => ({
    prescription: {
      load: { kind: 'working' },
      reps: { kind: 'range', low: range.low, high: range.high },
    },
    outcome: 'pending',
    isWarmup: false,
    ...(plan?.load !== undefined ? { plannedLoad: plan.load } : {}),
    plannedReps,
  }))

  const at = Math.max(-1, Math.min(workout.entries.length - 1, request.afterIndex))
  const added: LogEntry = {
    exerciseId: exercise.id,
    role: 'hypertrophy',
    variant: exercise.isCompound ? 'Compound' : 'Isolation',
    order: workout.entries[at]?.order ?? 0,
    sets,
  }
  const updated = {
    ...workout,
    entries: [...workout.entries.slice(0, at + 1), added, ...workout.entries.slice(at + 1)],
  }
  await deps.workouts.save(updated)
  return updated
}
