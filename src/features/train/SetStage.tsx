import { describePrescription } from '@/domain/programs/prescription'
import type { ExerciseId, WorkoutId } from '@/domain/ids/ids'
import { recordFor } from '@/domain/logging/records'
import type { LoggedSet } from '@/domain/logging/workout-log'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'

import { usePreviousSet, usePriorSets } from './hooks'

/**
 * The set you are about to do, as large as the screen allows.
 *
 * **The player's whole job is this number.** The first set to log used to
 * sit 656 pixels down an 812-pixel phone, under a warm-up ramp, a bar
 * picture, a ladder and a tempo picker: everything about the set stood
 * between you and the set. Now the load reads from the floor and the rest
 * folds behind one strip.
 *
 * The figure shrinks with its length, because 102.5 at the size of 210 runs
 * off a phone.
 */
export function SetStage({
  set,
  setIndex,
  exerciseId,
  workoutId,
  variant,
  bodyweight,
  units,
}: {
  readonly set: LoggedSet
  readonly setIndex: number
  readonly exerciseId: ExerciseId
  readonly workoutId: WorkoutId
  readonly variant: string | undefined
  readonly bodyweight: boolean
  readonly units: WeightUnit
}) {
  const { data: previous } = usePreviousSet(exerciseId, setIndex, workoutId, variant)
  const { data: prior } = usePriorSets(exerciseId, workoutId)

  const heaviest =
    prior !== undefined &&
    recordFor({ load: set.plannedLoad, reps: set.plannedReps ?? 1 }, prior) === 'heaviest'
  const [amount, unit] = figureOf(set.plannedLoad, bodyweight, units)
  const reps =
    set.plannedReps !== undefined
      ? String(set.plannedReps)
      : set.prescription.reps.kind === 'time'
        ? describePrescription(set.prescription)
        : undefined

  return (
    <div className="flex flex-1 flex-col justify-center py-4">
      <p className="font-display flex items-baseline gap-2 leading-none font-bold">
        <span className={`${sizeOf(amount)} tracking-[-0.03em]`}>{amount}</span>
        {unit !== undefined && <span className="text-ink-500 text-2xl font-medium">{unit}</span>}
      </p>
      {reps !== undefined && (
        <p className="font-display mt-1 text-[3.5rem] leading-tight font-semibold tracking-tight">
          <span className="text-ink-500">×</span> {reps}
        </p>
      )}
      <p className="numeric text-ink-500 mt-2 flex flex-wrap gap-x-3 text-[0.9375rem]">
        {previous != null && (previous.load !== undefined || bodyweight) && (
          <span>
            Last time {describeLoad(previous.load, bodyweight, units)} ×{' '}
            {String(previous.reps ?? '—')}
          </span>
        )}
        {heaviest && <span className="text-gold-400">Heaviest yet</span>}
        {set.plannedLoad === undefined && !bodyweight && previous == null && (
          <span>No load yet. Enter what you lift.</span>
        )}
      </p>
    </div>
  )
}

function figureOf(
  load: number | undefined,
  bodyweight: boolean,
  units: WeightUnit,
): readonly [string, string | undefined] {
  if (bodyweight)
    return load === undefined || load <= 0 ? ['BW', undefined] : [`+${String(load)}`, units]
  return load === undefined ? ['Open', undefined] : [String(load), units]
}

function sizeOf(amount: string): string {
  if (amount.length <= 3) return 'text-[9rem]'
  if (amount.length === 4) return 'text-[7rem]'
  return 'text-[5.5rem]'
}

function describeLoad(load: number | undefined, bodyweight: boolean, units: WeightUnit): string {
  if (bodyweight) return load === undefined || load <= 0 ? 'BW' : `BW + ${formatLoad(load, units)}`
  return load === undefined ? '—' : formatLoad(load, units)
}
