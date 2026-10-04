import type { WorkoutId } from '@/domain/ids/ids'
import { moveEntry } from '@/domain/logging/reorder'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import type { WorkoutRepository } from '@/domain/repositories/ports'

/** Moves an exercise of the open session a place up or down; see `moveEntry`. */
export async function reorderSession(
  request: { readonly workoutId: WorkoutId; readonly at: number; readonly by: -1 | 1 },
  deps: { readonly workouts: WorkoutRepository },
): Promise<WorkoutLog> {
  const workout = await deps.workouts.byId(request.workoutId)
  if (workout?.status !== 'in-progress') throw new Error('No open session to reorder.')
  const moved = moveEntry(workout.entries, request.at, request.by)
  if (typeof moved === 'string') throw new Error(`That exercise cannot move there (${moved}).`)
  const updated = { ...workout, entries: moved }
  await deps.workouts.save(updated)
  return updated
}
