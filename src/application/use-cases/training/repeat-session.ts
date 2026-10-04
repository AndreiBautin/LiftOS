import { asWorkoutId, type IdGenerator, type WorkoutId } from '@/domain/ids/ids'
import { entriesFromTemplate, type SessionTemplate } from '@/domain/logging/template'
import type { LogEntry, WorkoutLog } from '@/domain/logging/workout-log'
import type { LoadResets } from '@/domain/programs/stall'
import type { Clock, ExerciseRepository, WorkoutRepository } from '@/domain/repositories/ports'

import { isoDate, planFromHistory, rangeOf } from './start-workout'
import { replanned } from './swap-exercise'

export interface RepeatSessionDeps {
  readonly workouts: WorkoutRepository
  readonly exercises: ExerciseRepository
  readonly ids: IdGenerator
  readonly clock: Clock
}

export type RepeatSessionResult =
  | { readonly kind: 'started'; readonly workout: WorkoutLog }
  | { readonly kind: 'resumed'; readonly workout: WorkoutLog }

/**
 * A past session, run again: the same exercises in the same order, the
 * same sets in the same ranges, and **today's loads, not that day's** —
 * each planned from the exercise's own history through `planFromHistory`,
 * so a session repeated from March opens at what the lifter does now.
 *
 * It is a freestyle session: no programme position, no slots, because
 * the programme did not ask for it. Notes, results and times are cleared,
 * a superset pairing is kept (it is how the session was run), and an
 * exercise since retired is left out. An open session always wins, as it
 * does for Start: repeating while one is open resumes that one.
 */
export async function repeatSession(
  request: { readonly sourceId: WorkoutId; readonly resets?: LoadResets },
  deps: RepeatSessionDeps,
): Promise<RepeatSessionResult> {
  const open = await deps.workouts.inProgress()
  if (open !== undefined) return { kind: 'resumed', workout: open }

  const source = await deps.workouts.byId(request.sourceId)
  if (source === undefined || source.status === 'in-progress') {
    throw new Error('No finished session to repeat.')
  }
  return { kind: 'started', workout: await openAgain(source.title, source.entries, request, deps) }
}

/**
 * A saved template, started as a freestyle session at today's loads —
 * the same build as Repeat, from a template's shape rather than a past
 * session's. An open session is resumed instead, as Start does.
 */
export async function startFromTemplate(
  request: { readonly template: SessionTemplate; readonly resets?: LoadResets },
  deps: RepeatSessionDeps,
): Promise<RepeatSessionResult> {
  const open = await deps.workouts.inProgress()
  if (open !== undefined) return { kind: 'resumed', workout: open }
  return {
    kind: 'started',
    workout: await openAgain(
      request.template.name,
      entriesFromTemplate(request.template),
      request,
      deps,
    ),
  }
}

/** Entries planned at today's loads and saved as a new open session. */
async function openAgain(
  title: string,
  from: readonly LogEntry[],
  request: { readonly resets?: LoadResets },
  deps: RepeatSessionDeps,
): Promise<WorkoutLog> {
  const library = await deps.exercises.all()

  const entries: LogEntry[] = []
  for (const entry of from) {
    const exercise = library.find((one) => one.id === entry.exerciseId)
    if (exercise === undefined || exercise.isArchived) continue
    const history = await deps.workouts.forExercise(exercise.id, 10)
    const plan = planFromHistory({
      exercise,
      variant: entry.variant,
      range: rangeOf(entry.sets),
      history,
      ...(request.resets !== undefined ? { resets: request.resets } : {}),
    })
    const { notes: _notes, slotId: _slot, substitutedFor: _swapped, ...rest } = entry
    entries.push({
      ...rest,
      order: entries.length,
      sets: entry.sets.map((set) => replanned(set, plan?.load, plan?.lastTime)),
    })
  }

  const now = deps.clock.now()
  const workout: WorkoutLog = {
    id: asWorkoutId(deps.ids.next()),
    date: isoDate(now),
    startedAt: now.toISOString(),
    status: 'in-progress',
    title,
    entries,
  }
  await deps.workouts.save(workout)
  return workout
}
