import { mondayOf } from '@/domain/time/day'

import type { WorkoutLog } from '@/domain/logging/workout-log'
import type { ExerciseId } from '@/domain/ids/ids'

/**
 * Double progression for an EMOM: reps on the minute, then minutes, then
 * the bell.
 *
 * Asked for as _"progress by one rep each week, then reset at 10 with one
 * more minute added, until we hit 30x30, at which point up the kb by 10
 * lbs"_, starting from 60 lb for ten minutes of ten. The same shape as the
 * lifting's double progression — climb inside a range, then move the next
 * thing — with three rungs instead of two.
 *
 * **It moves once a calendar week, not once a session.** The swings close
 * every session, so per session it would climb five rungs a week; the rule
 * asked for is per week. Every session in a week runs the week's EMOM, and
 * the first one of the next week takes the next rung from what was done.
 *
 * **Nothing is stored**, as for the lifting: the step is read off the last
 * EMOM logged, whose prescription says its minutes (a log describes itself).
 */
export interface EmomStep {
  readonly load: number
  /** Reps on each minute. */
  readonly reps: number
  readonly minutes: number
}

/** Where a first EMOM opens: what was being done when this was asked for. */
export const EMOM_START: EmomStep = { load: 60, reps: 10, minutes: 10 }

/** The floor both counts reset to. */
const EMOM_FLOOR = 10
/** The cap on both counts. */
const EMOM_CAP = 30
/** What goes on the bell at 30 × 30. */
const EMOM_BELL_STEP = 10

/** The next rung: a rep, else a minute with the reps back at ten, else the bell. */
export function nextEmom(step: EmomStep): EmomStep {
  if (step.reps < EMOM_CAP) return { ...step, reps: step.reps + 1 }
  if (step.minutes < EMOM_CAP) return { ...step, reps: EMOM_FLOOR, minutes: step.minutes + 1 }
  return { load: step.load + EMOM_BELL_STEP, reps: EMOM_FLOOR, minutes: EMOM_FLOOR }
}

/**
 * A deload's EMOM: **the same bell**, a quarter off the reps on the minute
 * and a third off the minutes — about half the work, as the lifting's
 * deload is. Rounded down, never under five of either.
 *
 * It took a quarter off the bell, the lifting's rule, for one release:
 * _"could we drop reps and keep load the same instead? i dont have a 45lb
 * kb"_. A bar takes any load the plates make; a kettlebell is the bells
 * on the floor, so the cut that a lifter can actually run is the reps.
 */
const DELOAD_REPS_SHARE = 0.75
const DELOAD_MINUTES_SHARE = 2 / 3
const DELOAD_MIN = 5

export function deloadEmom(step: EmomStep): EmomStep {
  return {
    load: step.load,
    reps: Math.max(DELOAD_MIN, Math.floor(step.reps * DELOAD_REPS_SHARE)),
    minutes: Math.max(DELOAD_MIN, Math.round(step.minutes * DELOAD_MINUTES_SHARE)),
  }
}

/**
 * The last EMOM of an exercise that was done, and the day it was done.
 *
 * **A deload is never last time**, as for the lifting: it is light on
 * purpose. The load and reps are what was logged, falling back to the plan;
 * the minutes are the prescription's, since a log describes itself. An
 * entry logged before swings were an EMOM (a timed block) is not one.
 */
export function lastEmom(
  history: readonly WorkoutLog[],
  id: ExerciseId,
): { readonly step: EmomStep; readonly date: string } | undefined {
  const newestFirst = history
    .filter((log) => log.deload !== true)
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))

  for (const log of newestFirst) {
    for (const entry of log.entries) {
      if (entry.exerciseId !== id) continue
      for (const set of entry.sets) {
        const { reps } = set.prescription
        if (set.isWarmup || set.outcome !== 'completed' || reps.kind !== 'emom') continue
        const load = set.actualLoad ?? set.plannedLoad
        const perMinute = set.actualReps ?? set.plannedReps
        if (load === undefined || perMinute === undefined || perMinute <= 0) continue
        return { step: { load, reps: perMinute, minutes: reps.minutes }, date: log.date }
      }
    }
  }
  return undefined
}

/**
 * The EMOM a session on `day` runs.
 *
 * Nothing done yet opens at the start. Done earlier this week, it is the
 * same again; done in an earlier week, the next rung. A deload is the
 * deload of what was last done, unprogressed, so the week after picks up
 * one rung past the working week before it.
 */
export function plannedEmom(
  history: readonly WorkoutLog[],
  id: ExerciseId,
  day: string,
  deload: boolean,
): EmomStep {
  const last = lastEmom(history, id)
  if (last === undefined) return deload ? deloadEmom(EMOM_START) : EMOM_START
  if (deload) return deloadEmom(last.step)
  return mondayOf(last.date) === mondayOf(day) ? last.step : nextEmom(last.step)
}
