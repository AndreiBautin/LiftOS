import type { Exercise } from '@/domain/exercises/exercise'
import type { MuscleGroup } from '@/domain/exercises/taxonomy'

import type { ProgramDay } from './program'

/**
 * The muscles a day trains directly, in the order the session reaches
 * them: each working slot's primary muscle, once. Warm-ups and
 * conditioning are left out — a foam roller and a treadmill walk are not
 * what tomorrow asks the chest to be ready for.
 */
export function dayMuscles(
  day: Pick<ProgramDay, 'slots'>,
  library: readonly Exercise[],
): readonly MuscleGroup[] {
  const out: MuscleGroup[] = []
  for (const slot of day.slots) {
    if (slot.role === 'warmup' || slot.role === 'conditioning') continue
    if (slot.exercise.kind !== 'specific') continue
    const id = slot.exercise.exerciseId
    const muscle = library.find((one) => one.id === id)?.primaryMuscle
    if (muscle !== undefined && !out.includes(muscle)) out.push(muscle)
  }
  return out
}
