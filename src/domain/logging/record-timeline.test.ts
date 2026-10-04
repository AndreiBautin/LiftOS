import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { recordTimeline } from './record-timeline'

const BENCH = asExerciseId('bench-press')

const session = (id: string, date: string, load: number, reps = 5) =>
  aWorkout({
    id: asWorkoutId(id),
    date,
    title: id,
    entries: [anEntry({ exerciseId: BENCH, sets: [aSet({ actualLoad: load, actualReps: reps })] })],
  })

describe('the records as a history', () => {
  const months = recordTimeline([
    session('first', '2026-08-03', 200),
    session('heavier', '2026-08-17', 205),
    session('more-reps', '2026-09-07', 205, 7),
    session('lighter', '2026-09-14', 195),
  ])

  it('groups records by month, newest first', () => {
    expect(months.map((month) => month.month)).toEqual(['2026-09', '2026-08'])
  })

  /* The first time is never a record; a lighter session sets none. */
  it('lists only what beat every time before', () => {
    expect(months.flatMap((month) => month.records.map((one) => [one.title, one.kind]))).toEqual([
      ['more-reps', 'reps'],
      ['heavier', 'heaviest'],
    ])
  })

  it('is empty with no records', () => {
    expect(recordTimeline([session('first', '2026-08-03', 200)])).toEqual([])
  })
})
