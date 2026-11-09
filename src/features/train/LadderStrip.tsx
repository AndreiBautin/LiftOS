import type { LoggedSet } from '@/domain/logging/workout-log'
import { ladderState, type LadderState } from '@/domain/programs/progression'
import type { RepRange } from '@/domain/programs/prescription'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { cn } from '@/lib/cn'

/**
 * Double progression, live, on the exercise being done.
 *
 * A small column per working set, filled to the reps done against the top of
 * the range; a set not yet done is a dashed ghost. Beside them, one sentence on the only question the method
 * asks — does this session earn the next load — answered as the sets
 * land rather than discovered next week.
 */
export function LadderStrip({
  sets,
  range,
  step,
  units,
  bodyweight,
}: {
  readonly sets: readonly LoggedSet[]
  readonly range: RepRange
  readonly step: number
  readonly units: WeightUnit
  readonly bodyweight: boolean
}) {
  const working = sets.filter((set) => !set.isWarmup)
  if (working.length === 0) return null

  const state = ladderState(
    working.map((set) => ({
      reps: set.actualReps,
      done: set.outcome === 'completed' && set.actualReps !== undefined,
      planned: set.plannedReps,
    })),
    range,
  )
  const bump = bodyweight ? 'more reps' : `+${formatLoad(step, units)}`

  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-2.5 text-sm',
        state.kind === 'earned' ? 'text-accent-400 font-semibold' : 'text-ink-500',
      )}
    >
      <span className="flex h-6 shrink-0 items-end gap-[3px]" aria-hidden>
        {working.map((set, index) => {
          const done = set.outcome === 'completed' && set.actualReps !== undefined
          const reps = done ? (set.actualReps ?? 0) : (set.plannedReps ?? range.low)
          const height = `${String(Math.max(0.15, Math.min(1, reps / range.high)) * 100)}%`
          const topped = done && reps >= range.high
          const onPlan = done && !topped && reps >= (set.plannedReps ?? range.high)
          return done ? (
            <span
              key={index}
              className={cn(
                'w-2.5 rounded-[3px]',
                topped ? 'bg-accent-400' : onPlan ? 'bg-accent-500/50' : 'bg-ink-500',
              )}
              style={{ height }}
            />
          ) : (
            <span
              key={index}
              className="border-ink-600 box-border h-full w-2.5 rounded-[3px] border border-dashed"
            />
          )
        })}
      </span>
      <span className="min-w-0">{sentence(state, range, bump)}</span>
    </div>
  )
}

function sentence(state: LadderState, range: RepRange, bump: string): string {
  switch (state.kind) {
    case 'open':
      return `${String(range.high)} on all ${String(state.sets)} sets earns ${bump} next time.`
    case 'on-track':
      return `Every set at ${String(range.high)} so far — ${String(state.left)} to go for ${bump}.`
    case 'earned':
      return `Earned: ${bump} next session.`
    case 'building':
      return `On plan at ${String(state.reps)}. ${String(range.high)} on every set earns ${bump}.`
    case 'missed':
      return `Set ${String(state.set)} came in under plan at ${String(state.reps)} — same bar next time.`
  }
}
