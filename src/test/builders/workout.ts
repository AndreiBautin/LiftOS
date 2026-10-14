import type { ExerciseId } from '@/domain/ids/ids'
import { asCheckInId, asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { LogEntry, LoggedSet, WorkoutLog } from '@/domain/logging/workout-log'
import type { SetPrescription } from '@/domain/programs/prescription'
import type { PostWorkoutCheckIn, WorkloadState } from '@/domain/autoregulation/check-in'
import type { MuscleGroup } from '@/domain/exercises/taxonomy'

/**
 * Builders for the shapes tests need most.
 *
 * They exist so a test that cares about one field does not have to spell
 * out fifteen others — which is what makes a test read as a statement
 * about behaviour rather than as a wall of setup.
 */

let counter = 0
const nextId = (): string => {
  counter += 1
  return `test-${String(counter)}`
}

export function aSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  const prescription: SetPrescription = overrides.prescription ?? {
    load: { kind: 'rpe', target: 8 },
    reps: { kind: 'fixed', reps: 5 },
  }

  return {
    prescription,
    plannedLoad: 270,
    plannedReps: 5,
    actualLoad: 270,
    actualReps: 5,
    outcome: 'completed',
    isWarmup: false,
    completedAt: '2026-08-24T10:00:00.000Z',
    ...overrides,
  }
}

export function anEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    exerciseId: asExerciseId('back-squat'),
    role: 'main',
    order: 0,
    sets: [aSet()],
    ...overrides,
  }
}

export function aWorkout(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: asWorkoutId(nextId()),
    date: '2026-08-24',
    startedAt: '2026-08-24T09:30:00.000Z',
    completedAt: '2026-08-24T10:45:00.000Z',
    status: 'completed',
    title: 'Squat day',
    entries: [anEntry()],
    ...overrides,
  }
}

export function aPostCheckIn(
  workload: Partial<Record<MuscleGroup, WorkloadState>>,
): PostWorkoutCheckIn {
  return {
    id: asCheckInId(nextId()),
    kind: 'post',
    workoutId: asWorkoutId(nextId()),
    recordedAt: '2026-08-24T10:50:00.000Z',
    workload,
  }
}

export const SQUAT: ExerciseId = asExerciseId('back-squat')
export const BENCH: ExerciseId = asExerciseId('bench-press')
