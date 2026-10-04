import type { ExerciseId } from '@/domain/ids/ids'
import { ladderState } from '@/domain/programs/progression'

import {
  isProgress,
  previousTopSet,
  topSetIn,
  versusLast,
  type Performance,
  type Versus,
} from './versus-last'
import type { LogEntry, WorkoutLog } from './workout-log'

/**
 * Three plain lines under a finished session: what moved, what did not,
 * and what next time holds.
 *
 * **Every judgement is one another screen already makes.** Moved and held
 * are `versusLast` on each exercise's top set against the session before
 * (`previousTopSet`) — the rule the set rows and the report's verdicts
 * read. Next time is `ladderState`, the ladder under the sets: every set
 * at the top of its range earns the next load, and a set below its own
 * plan means the same bar again. So the debrief cannot say a lift moved
 * that the list beneath it calls matched.
 *
 * A first session of an exercise has nothing to move against and is left
 * out of the first two lines; it can still earn the next load.
 */
export interface Moved {
  readonly exerciseId: ExerciseId
  readonly top: Performance
  readonly versus: Versus
}

export interface Next {
  readonly exerciseId: ExerciseId
  /**
   * `up`: every set reached the top, the bar goes up. `repeat`: a set fell
   * short of its plan, the same bar again. `build`: on plan and below the
   * top — the same bar, a rep more, which is most sessions.
   */
  readonly kind: 'up' | 'repeat' | 'build'
  /** The load to come back to: the top set's, before any step is added. */
  readonly load?: number | undefined
}

export interface Debrief {
  readonly moved: readonly Moved[]
  readonly held: readonly Moved[]
  readonly next: readonly Next[]
}

const ORDER: Readonly<Record<Next['kind'], number>> = { up: 0, repeat: 1, build: 2 }

/** Heavier before more reps, then by how much — the order the method moves in. */
const rank = (versus: Versus) =>
  versus.kind === 'heavier' ? 1000 + versus.by : versus.kind === 'more-reps' ? versus.by : 0

function rangeOf(entry: LogEntry) {
  const reps = entry.sets.find((set) => !set.isWarmup)?.prescription.reps
  return reps?.kind === 'range' ? { low: reps.low, high: reps.high } : undefined
}

export function debrief(workout: WorkoutLog, history: readonly WorkoutLog[]): Debrief {
  const moved: Moved[] = []
  const held: Moved[] = []
  const next: Next[] = []
  const seen = new Set<string>()

  for (const entry of workout.entries) {
    if (entry.role === 'warmup' || entry.role === 'conditioning') continue
    const key = `${entry.exerciseId}|${entry.variant ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)

    const top = topSetIn(workout, entry.exerciseId, entry.variant)
    if (top === undefined) continue
    const before = previousTopSet(history, workout, entry.exerciseId, entry.variant)
    const versus = before === undefined ? undefined : versusLast(top, before)
    if (versus !== undefined) {
      ;(isProgress(versus) ? moved : held).push({ exerciseId: entry.exerciseId, top, versus })
    }

    const range = rangeOf(entry)
    const working = entry.sets.filter((set) => !set.isWarmup)
    if (range === undefined || working.length === 0) continue
    const state = ladderState(
      working.map((set) => ({
        reps: set.actualReps,
        done: set.outcome === 'completed' && set.actualReps !== undefined,
        planned: set.plannedReps,
      })),
      range,
    )
    if (state.kind === 'earned')
      next.push({ exerciseId: entry.exerciseId, kind: 'up', load: top.load })
    if (state.kind === 'missed')
      next.push({ exerciseId: entry.exerciseId, kind: 'repeat', load: top.load })
    if (state.kind === 'building')
      next.push({ exerciseId: entry.exerciseId, kind: 'build', load: top.load })
  }

  return {
    moved: moved.toSorted((a, b) => rank(b.versus) - rank(a.versus)),
    held,
    // What goes up leads: it is the thing to load the bar for.
    next: next.toSorted((a, b) => ORDER[a.kind] - ORDER[b.kind]),
  }
}
