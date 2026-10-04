import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { sessionCrest } from './crest'

const bench = asExerciseId('bench-press')
const curl = asExerciseId('dumbbell-curl')
const roll = asExerciseId('roll-lats')

const session = (id: string) =>
  aWorkout({
    id: asWorkoutId(id),
    entries: [
      anEntry({ exerciseId: roll, sets: [aSet({ isWarmup: true })] }),
      anEntry({ exerciseId: bench, sets: [aSet(), aSet(), aSet()] }),
      anEntry({ exerciseId: curl, sets: [aSet(), aSet({ outcome: 'skipped' })] }),
    ],
  })

describe('a session crest', () => {
  it('cuts the ring by working sets, leaving warm-ups out', () => {
    const crest = sessionCrest(session('a'), new Set())
    expect(crest.totalSets).toBe(4)
    expect(crest.segments.map((one) => [one.exerciseId, one.sets])).toEqual([
      [bench, 3],
      [curl, 1],
    ])
    expect(crest.segments.reduce((sum, one) => sum + one.share, 0)).toBeCloseTo(1)
  })

  it('picks out the exercises that set a record', () => {
    const crest = sessionCrest(session('a'), new Set([curl]))
    expect(crest.segments.map((one) => one.record)).toEqual([false, true])
  })

  /* Drawn the same every time, and two sessions alike still sit apart. */
  it('turns each session its own way, the same way every time', () => {
    expect(sessionCrest(session('a'), new Set()).rotation).toBe(
      sessionCrest(session('a'), new Set()).rotation,
    )
    expect(sessionCrest(session('a'), new Set()).rotation).not.toBe(
      sessionCrest(session('b'), new Set()).rotation,
    )
  })
})
