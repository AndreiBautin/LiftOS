import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { LoggedSet, WorkoutLog } from '@/domain/logging/workout-log'
import type { ExerciseRepository, WorkoutRepository } from '@/domain/repositories/ports'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { repeatSession } from './repeat-session'

const ROW = asExerciseId('barbell-row')
const range = { load: { kind: 'working' }, reps: { kind: 'range', low: 5, high: 10 } } as const

const done = (load: number, reps: number): LoggedSet =>
  aSet({
    prescription: range as unknown as LoggedSet['prescription'],
    actualLoad: load,
    actualReps: reps,
    notes: 'grip slipped',
    completedAt: '2026-03-02T18:10:00Z',
  })

function harness(logs: WorkoutLog[]) {
  const workouts = {
    inProgress: () => Promise.resolve(logs.find((log) => log.status === 'in-progress')),
    byId: (id: string) => Promise.resolve(logs.find((log) => log.id === id)),
    forExercise: (id: string) =>
      Promise.resolve(
        logs
          .filter((log) => log.entries.some((entry) => entry.exerciseId === id))
          .toSorted((a, b) => b.date.localeCompare(a.date)),
      ),
    save: (log: WorkoutLog) => {
      logs.push(log)
      return Promise.resolve()
    },
  } as unknown as WorkoutRepository
  const exercises = {
    all: () => Promise.resolve(builtInExercises()),
  } as unknown as ExerciseRepository
  return {
    workouts,
    exercises,
    ids: { next: () => 'again' },
    clock: { now: () => new Date('2026-10-05T18:00:00Z') },
  }
}

const march = aWorkout({
  id: asWorkoutId('march'),
  date: '2026-03-02',
  title: 'Pull day',
  notes: 'felt flat',
  entries: [anEntry({ exerciseId: ROW, order: 0, sets: [done(135, 8), done(135, 8)] })],
})

/* Since March the row has moved on; the repeat opens at today's bar. */
const september = aWorkout({
  id: asWorkoutId('september'),
  date: '2026-09-28',
  entries: [anEntry({ exerciseId: ROW, sets: [done(185, 7), done(185, 6)] })],
})

describe('repeating a past session', () => {
  it('runs the same exercises and sets at today’s loads, results cleared', async () => {
    const deps = harness([march, september])
    const result = await repeatSession({ sourceId: asWorkoutId('march') }, deps)
    expect(result.kind).toBe('started')
    const { workout } = result
    expect(workout).toMatchObject({ status: 'in-progress', title: 'Pull day', date: '2026-10-05' })
    expect(workout.notes).toBeUndefined()
    expect(workout.position).toBeUndefined()
    const sets = workout.entries[0]?.sets ?? []
    expect(sets).toHaveLength(2)
    expect(sets[0]).toMatchObject({ outcome: 'pending', plannedLoad: 185, plannedReps: 7 })
    expect(sets[0]?.actualLoad).toBeUndefined()
    expect(sets[0]?.notes).toBeUndefined()
  })

  it('resumes an open session rather than starting a second', async () => {
    const open = aWorkout({ id: asWorkoutId('open'), status: 'in-progress' })
    const result = await repeatSession({ sourceId: asWorkoutId('march') }, harness([march, open]))
    expect(result).toMatchObject({ kind: 'resumed', workout: { id: 'open' } })
  })
})
