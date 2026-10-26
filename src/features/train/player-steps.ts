/**
 * The session player's arithmetic, kept apart from its 900-line component
 * so it can be tested: which set comes next and how it reads, which
 * warm-up run a row belongs to, where a reopened session lands, what is on
 * the bar, and how long to rest. Pure functions of the workout and the
 * library; the player only renders what they answer.
 */
import type { Exercise } from '@/domain/exercises/exercise'
import type { ExerciseId } from '@/domain/ids/ids'
import { isEntryComplete, type LogEntry, type WorkoutLog } from '@/domain/logging/workout-log'
import { describePrescription } from '@/domain/programs/prescription'
import { restAfter, type RestPlan, type RestWork } from '@/domain/programs/rest'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'

/**
 * The set the rest is leading up to, in the words the row will use: on
 * this exercise it is "Set 3", past it the exercise's name — with the
 * planned load and reps, so the bar can be loaded while the clock runs.
 */
export function nextUp(
  workout: WorkoutLog,
  from: number,
  nameOf: (id: ExerciseId) => string,
  exercises: readonly Exercise[],
  units: WeightUnit,
): { readonly title: string; readonly detail: string } | undefined {
  for (let at = from; at < workout.entries.length; at += 1) {
    const entry = workout.entries[at]
    if (entry === undefined) continue
    const setIndex = entry.sets.findIndex((set) => set.outcome === 'pending')
    const set = entry.sets[setIndex]
    if (set === undefined) continue
    const bodyweight =
      exercises.find((one) => one.id === entry.exerciseId)?.loadBasis === 'bodyweight'
    const load =
      set.plannedLoad === undefined
        ? undefined
        : bodyweight
          ? set.plannedLoad > 0
            ? `BW + ${formatLoad(set.plannedLoad, units)}`
            : 'BW'
          : formatLoad(set.plannedLoad, units)
    return {
      title: at === from ? `Set ${String(setIndex + 1)}` : nameOf(entry.exerciseId),
      detail:
        load === undefined || set.plannedReps === undefined
          ? describePrescription(set.prescription)
          : `${load} × ${String(set.plannedReps)}`,
    }
  }
  return undefined
}

/** The indices of the warm-up run `at` sits in, or undefined if it is not a warm-up. */
export function warmupRun(workout: WorkoutLog, at: number): readonly number[] | undefined {
  const isWarmup = (i: number) => workout.entries[i]?.role === 'warmup'
  if (!isWarmup(at)) return undefined
  let start = at
  while (isWarmup(start - 1)) start -= 1
  let end = at
  while (isWarmup(end + 1)) end += 1
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
}

export function runStart(workout: WorkoutLog, at: number): number {
  return warmupRun(workout, at)?.[0] ?? at
}

/**
 * Where Next goes from `at`: past the whole warm-up run it sits in. One
 * past `at` is inside the run, and the player snaps that back to the run's
 * first row, so a button that stepped one went nowhere.
 */
export function nextStep(workout: WorkoutLog, at: number): number {
  return (warmupRun(workout, at)?.at(-1) ?? at) + 1
}

/**
 * The weight the bar should hold now: the next pending set's planned load,
 * or, once every set is settled, the last one actually lifted — so the
 * picture still answers "what is on the bar" while you strip it.
 */
export function loadToShow(sets: WorkoutLog['entries'][number]['sets']): number | undefined {
  const pending = sets.find((set) => set.outcome === 'pending' && !set.isWarmup)
  if (pending !== undefined) return pending.plannedLoad
  return [...sets].reverse().find((set) => set.actualLoad !== undefined)?.actualLoad
}

export function firstIncompleteIndex(workout: WorkoutLog): number {
  const found = workout.entries.findIndex((entry) => !isEntryComplete(entry))
  return found === -1 ? 0 : found
}

/**
 * The rest after a set, from what it was and what comes next — see
 * `restAfter`. The last working set of an exercise rests for the next
 * exercise with anything left to do.
 */
export function restFor(
  workout: WorkoutLog,
  entryIndex: number,
  setIndex: number,
  doneReps: number | undefined,
  exercises: readonly Exercise[],
): RestPlan {
  const entry = workout.entries[entryIndex]
  if (entry === undefined) return { seconds: 0, reason: '' }
  const workOf = (one: LogEntry) => restWorkOf(one, exercises)
  const lastOfExercise = !entry.sets.some(
    (set, at) => at !== setIndex && !set.isWarmup && set.outcome === 'pending',
  )
  const next = workout.entries
    .slice(entryIndex + 1)
    .find((one) => one.sets.some((set) => set.outcome === 'pending'))
  return restAfter({
    work: workOf(entry),
    next: next === undefined ? undefined : workOf(next),
    lastOfExercise,
    plannedReps: entry.sets[setIndex]?.plannedReps,
    doneReps,
  })
}

/** What a slot asks of the rest timer: its role, and the exercise's own rest. */
export function restWorkOf(entry: LogEntry, exercises: readonly Exercise[]): RestWork {
  const exercise = exercises.find((candidate) => candidate.id === entry.exerciseId)
  return {
    role: entry.role,
    isCompound: exercise?.isCompound ?? false,
    restSeconds: exercise?.defaultRestSeconds,
  }
}
