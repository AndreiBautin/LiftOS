import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { trainingTimes } from './training-times'

const BENCH = asExerciseId('bench-press')

/* Local times, written without a zone, so the test reads as the lifter lived it. */
const session = (id: string, startedAt: string, load: number) =>
  aWorkout({
    id: asWorkoutId(id),
    date: startedAt.slice(0, 10),
    startedAt,
    entries: [anEntry({ exerciseId: BENCH, sets: [aSet({ actualLoad: load, actualReps: 5 })] })],
  })

describe('when the training happens', () => {
  const times = trainingTimes([
    session('a', '2026-09-07T18:30:00', 200), // Monday evening
    session('b', '2026-09-09T06:15:00', 205), // Wednesday early
    session('c', '2026-09-14T19:05:00', 210), // Monday evening
    aWorkout({ id: asWorkoutId('open'), status: 'in-progress', startedAt: '2026-09-15T18:00:00' }),
  ])

  it('counts finished sessions by weekday and part of day', () => {
    expect(times.sessions).toBe(3)
    expect(times.grid[0]?.[4]).toBe(2)
    expect(times.grid[2]?.[0]).toBe(1)
    expect(times.grid.flat().reduce((sum, count) => sum + count, 0)).toBe(3)
  })

  /* The first session sets no record; each heavier one after it does. */
  it('files each record under the part of day it was set in', () => {
    expect(times.records).toMatchObject({ early: 1, evening: 1, morning: 0 })
  })
})
