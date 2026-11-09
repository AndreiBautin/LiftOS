import type { ExerciseId, WorkoutId } from '@/domain/ids/ids'
import { recordFor } from '@/domain/logging/records'
import { versusLast } from '@/domain/logging/versus-last'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'

import { usePreviousSet, usePriorSets } from './hooks'
import { RecordChip } from './RecordChip'
import { VersusChip } from './VersusChip'

/**
 * What the set just logged was, and how it did, across the top of the rest
 * screen. By the rules a logged row uses: a record outranks "ahead of last
 * time", and both are read from the sessions before this one.
 */
export function LoggedLine({
  exerciseId,
  setIndex,
  workoutId,
  variant,
  load,
  reps,
  units,
  onUndo,
}: {
  readonly exerciseId: ExerciseId
  readonly setIndex: number
  readonly workoutId: WorkoutId
  readonly variant: string | undefined
  readonly load: number | undefined
  readonly reps: number | undefined
  readonly units: WeightUnit
  /** Present for the few seconds an undo is on offer. */
  readonly onUndo: (() => void) | undefined
}) {
  const { data: previous } = usePreviousSet(exerciseId, setIndex, workoutId, variant)
  const { data: prior } = usePriorSets(exerciseId, workoutId)
  const record = prior === undefined ? undefined : recordFor({ load, reps }, prior)

  return (
    <div className="bg-ink-900 border-ink-800 flex min-h-[3.25rem] items-center gap-3 rounded-2xl border py-1 pr-1.5 pl-3.5">
      <span className="numeric min-w-0 flex-1 truncate text-[0.9375rem]">
        Logged {load === undefined ? '' : `${formatLoad(load, units)} × `}
        {String(reps ?? '—')}
      </span>
      {record !== undefined ? (
        <RecordChip kind={record} />
      ) : (
        previous != null && (
          <VersusChip
            versus={versusLast({ load, reps }, { load: previous.load, reps: previous.reps })}
            units={units}
          />
        )
      )}
      {onUndo !== undefined && (
        <button
          type="button"
          onClick={onUndo}
          className="tap-target text-ink-300 shrink-0 px-2.5 text-[0.9375rem] font-medium"
        >
          Undo
        </button>
      )}
    </div>
  )
}
