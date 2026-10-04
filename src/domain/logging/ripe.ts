import type { ExerciseId } from '@/domain/ids/ids'

import type { ExerciseBests } from './bests'
import { previousTopSet } from './versus-last'
import type { WorkoutLog } from './workout-log'

export interface RipeLift {
  readonly exerciseId: ExerciseId
  readonly variant: string | undefined
  /** The bar the session opens at, and the reps it asks for. */
  readonly load: number
  readonly reps: number | undefined
  /** Last time's top bar, when the plan puts more on. */
  readonly from?: number
  /** The planned bar is heavier than any this lift has carried. */
  readonly heaviest?: true
}

/**
 * What the next session is ready to push: each lift whose planned bar is
 * heavier than its last top set — the increment double progression earned
 * — and flags a bar heavier than this lift has ever carried.
 *
 * **Not rep records.** Double progression plans one rep past last time,
 * so at the heaviest bar nearly every lift is planned as a rep record
 * every session; the first version tagged four of four and said nothing.
 *
 * **Read off the plan, not guessed**: the loads are the preview Start would
 * open with (`previewWorkout`), so this names nothing the session will not
 * actually ask for. Warm-ups and sets with no planned load are left out.
 */
export function ripeLifts(
  preview: WorkoutLog,
  history: readonly WorkoutLog[],
  bests: readonly ExerciseBests[],
): readonly RipeLift[] {
  const out: RipeLift[] = []
  for (const entry of preview.entries) {
    const first = entry.sets.find((set) => !set.isWarmup && set.plannedLoad !== undefined)
    if (first?.plannedLoad === undefined || first.plannedLoad <= 0) continue
    const load = first.plannedLoad
    const reps = first.plannedReps
    const last = previousTopSet(history, preview, entry.exerciseId, entry.variant)
    const best = bests.find((one) => one.exerciseId === entry.exerciseId)?.heaviest
    const from = last?.load !== undefined && load > last.load ? last.load : undefined
    const heaviest = best !== undefined && load > best.load
    if (from === undefined && !heaviest) continue
    out.push({
      exerciseId: entry.exerciseId,
      variant: entry.variant,
      load,
      reps,
      ...(from === undefined ? {} : { from }),
      ...(heaviest ? { heaviest: true as const } : {}),
    })
  }
  return out
}
