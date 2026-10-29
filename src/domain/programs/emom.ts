import { mondayOf } from '@/domain/time/day'

import type { WorkoutLog } from '@/domain/logging/workout-log'
import type { ExerciseId } from '@/domain/ids/ids'

/**
 * Double progression for an EMOM: reps on the minute, then the bell.
 *
 * Asked for as _"the only thing we progress is reps up to 30, then up the
 * weight and reprogress"_, at _"always 10 minutes"_. The lifting's double
 * progression with the minute as the set: climb the reps to the top, then
 * ten pounds on the bell and back to ten. **Two EMOMs run it**, each on its
 * own ladder: the clean and press closing the upper days from a 30 lb bell,
 * the swings closing the lower days from 60 lb.
 *
 * It first climbed the minutes too — ten reps again with a minute more at
 * thirty, the bell only at 30 × 30 — and that went within the day. The
 * minutes are fixed now, so they are written on the plan and never read
 * back from a log.
 *
 * **It moves once a calendar week, not once a session.** Each EMOM runs
 * twice a week, so per session it would climb two reps a week; the rule
 * asked for is per week. Every session in a week runs the week's EMOM, and
 * the first one of the next week takes the next rung from what was done.
 *
 * **Nothing is stored**, as for the lifting: the step is read off the last
 * EMOM logged.
 */
export interface EmomStep {
  readonly load: number
  /** Reps on each minute. */
  readonly reps: number
  readonly minutes: number
}

/** Always ten minutes. */
const EMOM_MINUTES = 10

/** Where a first EMOM opens: ten on the minute for ten minutes. */
export const EMOM_START: Omit<EmomStep, 'load'> = { reps: 10, minutes: EMOM_MINUTES }

/** The bell each EMOM opens on, by exercise; one not named opens on the lighter. */
const START_BELL: Readonly<Record<string, number>> = { 'kb-swing': 60, 'kb-clean-press': 30 }
const DEFAULT_START_BELL = 30

/** An exercise's first EMOM. */
function emomStart(id: ExerciseId): EmomStep {
  return { ...EMOM_START, load: START_BELL[id] ?? DEFAULT_START_BELL }
}

/** Where the reps start, and start again on a heavier bell. */
const EMOM_FLOOR = 10
/** Where the reps stop and the bell goes up. */
const EMOM_CAP = 30
/** What goes on the bell at thirty. */
const EMOM_BELL_STEP = 10

/** The next rung: a rep, else ten pounds on the bell with the reps back at ten. */
export function nextEmom(step: EmomStep): EmomStep {
  if (step.reps < EMOM_CAP) return { ...step, reps: step.reps + 1, minutes: EMOM_MINUTES }
  return { load: step.load + EMOM_BELL_STEP, reps: EMOM_FLOOR, minutes: EMOM_MINUTES }
}

/**
 * A deload's EMOM: **the same bell, half the reps on the minute and half
 * the minutes**, rounded down — _"for the deload, just half the reps and
 * sets and keep weight the same"_. A kettlebell is the bells on the floor,
 * so the cut is in the work, never the bell. It was a quarter off the bell,
 * then fewer reps, then the 30 lb bell at the same reps, each for a release.
 */
export function deloadEmom(step: EmomStep): EmomStep {
  return {
    load: step.load,
    reps: Math.max(1, Math.floor(step.reps / 2)),
    minutes: Math.floor(EMOM_MINUTES / 2),
  }
}

/**
 * The last EMOM of an exercise that was done, and the day it was done.
 *
 * **A deload is never last time**, as for the lifting: it is light on
 * purpose. The load and reps are what was logged, falling back to the plan.
 * An entry logged before swings were an EMOM (a timed block) is not one.
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
        return { step: { load, reps: perMinute, minutes: EMOM_MINUTES }, date: log.date }
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
  if (last === undefined) return deload ? deloadEmom(emomStart(id)) : emomStart(id)
  if (deload) return deloadEmom(last.step)
  return mondayOf(last.date) === mondayOf(day) ? last.step : nextEmom(last.step)
}

/**
 * Where an EMOM stands, `elapsed` milliseconds after it started: which
 * minute (from one), the seconds left in it (rounded up, so a fresh minute
 * reads 60), and whether every minute is over.
 */
interface EmomReading {
  readonly round: number
  readonly secondsLeft: number
  readonly done: boolean
}

const MINUTE = 60_000

export function emomAt(elapsed: number, minutes: number): EmomReading {
  const total = minutes * MINUTE
  if (elapsed >= total) return { round: minutes, secondsLeft: 0, done: true }
  const at = Math.max(0, elapsed)
  const round = Math.floor(at / MINUTE) + 1
  return { round, secondsLeft: Math.ceil((round * MINUTE - at) / 1000), done: false }
}

/** A sound the EMOM makes: a tick in a minute's last seconds, a go at the next, a chime at the end. */
export type EmomCue = 'tick' | 'go' | 'done'

const TICK_AT = [3, 2, 1] as const

/**
 * Which cues sound between two readings of the time elapsed — negative
 * during the count-in, so the first minute gets its ticks and its go too.
 *
 * **By crossing, not by equality**, the rest timer's rule: readings come
 * every quarter second and a phone in a pocket can jump several marks at
 * once. A jump over more than one mark sounds only the latest — the start
 * of the minute it landed in, or the end — never a burst.
 */
export function emomCuesBetween(before: number, now: number, minutes: number): readonly EmomCue[] {
  if (now <= before) return []
  const total = minutes * MINUTE
  if (before < total && now >= total) return ['done']

  // Every minute's start, the first included: the timer counts in from below zero.
  const minuteMarks = Array.from({ length: minutes }, (_, index) => index * MINUTE)
  if (minuteMarks.some((mark) => before < mark && now >= mark)) return ['go']

  const ticks = minuteMarks
    .concat(total)
    .flatMap((mark) => TICK_AT.map((seconds) => mark - seconds * 1000))
    .filter((mark) => before < mark && now >= mark)
  return ticks.length === 1 ? ['tick'] : []
}
