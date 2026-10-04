import type { ExerciseId, IdGenerator } from '@/domain/ids/ids'
import { asWorkoutId } from '@/domain/ids/ids'
import type { ImportedExport } from '@/domain/logging/import-csv'
import type { LogEntry, LoggedSet, WorkoutLog } from '@/domain/logging/workout-log'
import type { SlotRole } from '@/domain/programs/program'
import type { ExerciseRepository, WorkoutRepository } from '@/domain/repositories/ports'
import { convertWeight, type WeightUnit } from '@/domain/units/weight'

export interface ImportTrainingDeps {
  readonly workouts: WorkoutRepository
  readonly exercises: ExerciseRepository
  readonly ids: IdGenerator
}

export interface ImportTrainingRequest {
  readonly exported: ImportedExport
  /** The other app's exercise name to a library exercise; absent or null leaves it out. */
  readonly mapping: Readonly<Record<string, ExerciseId | null>>
  /** The unit the file's loads are in. */
  readonly from: WeightUnit
  /** The unit this app logs in. */
  readonly to: WeightUnit
}

export interface ImportTrainingResult {
  readonly imported: number
  /** Sessions already here, by start time, so importing twice adds nothing. */
  readonly alreadyHere: number
  /** Entries left out because their exercise was not mapped. */
  readonly leftOut: number
}

/**
 * Another app's history, filed as finished sessions.
 *
 * **Re-importing is safe**: a session whose start time is already a
 * session's here is skipped, so the same file twice files nothing twice.
 * **What was done is all that comes across** — loads converted into this
 * app's unit, reps, warm-ups as warm-ups — with an open prescription,
 * because the other app's plan is not this one's and inventing a range
 * for it would claim a programme nobody ran. Sets carry no times, so a
 * session's timeline and replay stay silent for it, which is the honest
 * reading. Written through `save`, so each is stamped as it arrives.
 */
export async function importTraining(
  request: ImportTrainingRequest,
  deps: ImportTrainingDeps,
): Promise<ImportTrainingResult> {
  const [library, existing] = await Promise.all([
    deps.exercises.all(),
    deps.workouts.recent(100_000),
  ])
  const startedHere = new Set(existing.map((log) => Date.parse(log.startedAt)))

  let imported = 0
  let alreadyHere = 0
  let leftOut = 0

  for (const session of request.exported.sessions) {
    if (startedHere.has(Date.parse(session.startedAt))) {
      alreadyHere += 1
      continue
    }
    const entries: LogEntry[] = []
    for (const entry of session.entries) {
      const exerciseId = request.mapping[entry.name] ?? null
      const exercise =
        exerciseId === null ? undefined : library.find((one) => one.id === exerciseId)
      if (exercise === undefined) {
        leftOut += 1
        continue
      }
      const role: SlotRole =
        exercise.intent === 'strength'
          ? 'strength'
          : exercise.intent === 'conditioning'
            ? 'conditioning'
            : 'hypertrophy'
      const sets: LoggedSet[] = entry.sets.map((set) => ({
        prescription: {
          load: { kind: 'open' },
          reps: { kind: 'fixed', reps: set.reps ?? 1 },
          ...(set.warmup ? { isWarmup: true } : {}),
        },
        ...(set.load === undefined
          ? {}
          : {
              actualLoad: Math.round(convertWeight(set.load, request.from, request.to) * 10) / 10,
            }),
        ...(set.reps === undefined ? {} : { actualReps: set.reps }),
        outcome: 'completed',
        isWarmup: set.warmup,
      }))
      entries.push({
        exerciseId: exercise.id,
        role,
        order: entries.length,
        sets,
        ...(entry.notes === undefined ? {} : { notes: entry.notes }),
      })
    }
    if (entries.length === 0) continue

    const log: WorkoutLog = {
      id: asWorkoutId(deps.ids.next()),
      date: session.date,
      startedAt: session.startedAt,
      completedAt: session.completedAt ?? session.startedAt,
      status: 'completed',
      title: session.title,
      entries,
    }
    await deps.workouts.save(log)
    startedHere.add(Date.parse(session.startedAt))
    imported += 1
  }

  return { imported, alreadyHere, leftOut }
}
