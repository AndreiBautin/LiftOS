import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import { asExerciseId } from '@/domain/ids/ids'
import type { ImportedExport } from '@/domain/logging/import-csv'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import type { ExerciseRepository, WorkoutRepository } from '@/domain/repositories/ports'

import { importTraining } from './import-training'

function harness() {
  const saved: WorkoutLog[] = []
  let next = 0
  const workouts = {
    recent: () => Promise.resolve([...saved]),
    save: (log: WorkoutLog) => {
      saved.push(log)
      return Promise.resolve()
    },
  } as unknown as WorkoutRepository
  const exercises = {
    all: () => Promise.resolve(builtInExercises()),
  } as unknown as ExerciseRepository
  return {
    deps: { workouts, exercises, ids: { next: () => `imported-${String((next += 1))}` } },
    saved,
  }
}

const FILE: ImportedExport = {
  source: 'hevy',
  units: 'kg',
  sessions: [
    {
      date: '2024-01-15',
      startedAt: '2024-01-15T18:30:00',
      completedAt: '2024-01-15T19:42:00',
      title: 'Upper',
      entries: [
        {
          name: 'Bench Press (Barbell)',
          sets: [
            { load: 40, reps: 10, warmup: true },
            { load: 100, reps: 5, warmup: false },
          ],
        },
        { name: 'Cable Crossover', sets: [{ load: 20, reps: 12, warmup: false }] },
      ],
    },
  ],
}

const MAPPING = { 'Bench Press (Barbell)': asExerciseId('bench-press'), 'Cable Crossover': null }

describe('importing another app’s history', () => {
  it('files each session as finished, in this app’s unit, warm-ups kept apart', async () => {
    const { deps, saved } = harness()
    const result = await importTraining(
      { exported: FILE, mapping: MAPPING, from: 'kg', to: 'lb' },
      deps,
    )
    expect(result).toEqual({ imported: 1, alreadyHere: 0, leftOut: 1 })
    const [log] = saved
    expect(log).toMatchObject({ status: 'completed', title: 'Upper', date: '2024-01-15' })
    expect(log?.entries).toHaveLength(1)
    expect(log?.entries[0]?.role).toBe('strength')
    expect(
      log?.entries[0]?.sets.map((set) => [set.isWarmup, set.actualLoad, set.actualReps]),
    ).toEqual([
      [true, 88.2, 10],
      [false, 220.5, 5],
    ])
  })

  /* The same file twice must not double the history. */
  it('skips a session already here', async () => {
    const { deps, saved } = harness()
    await importTraining({ exported: FILE, mapping: MAPPING, from: 'kg', to: 'lb' }, deps)
    const again = await importTraining(
      { exported: FILE, mapping: MAPPING, from: 'kg', to: 'lb' },
      deps,
    )
    expect(again).toEqual({ imported: 0, alreadyHere: 1, leftOut: 0 })
    expect(saved).toHaveLength(1)
  })

  it('files nothing for a session whose every exercise was left out', async () => {
    const { deps, saved } = harness()
    const result = await importTraining({ exported: FILE, mapping: {}, from: 'kg', to: 'kg' }, deps)
    expect(result).toEqual({ imported: 0, alreadyHere: 0, leftOut: 2 })
    expect(saved).toHaveLength(0)
  })
})
