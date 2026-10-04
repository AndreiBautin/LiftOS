import { describe, expect, it } from 'vitest'

import { asExerciseId } from '@/domain/ids/ids'
import { anEntry, aSet } from '@/test/builders/workout'

import { moveEntry } from './reorder'

const warmup = anEntry({ exerciseId: asExerciseId('roll'), sets: [aSet({ isWarmup: true })] })
const bench = anEntry({ exerciseId: asExerciseId('bench'), order: 1 })
const row = anEntry({ exerciseId: asExerciseId('row'), order: 2 })
const curl = anEntry({ exerciseId: asExerciseId('curl'), order: 3, superset: 'a' })
const pushdown = anEntry({ exerciseId: asExerciseId('pushdown'), order: 4, superset: 'a' })
const session = [warmup, bench, row, curl, pushdown]

describe('reordering an open session', () => {
  it('swaps an exercise with its neighbour and renumbers', () => {
    const moved = moveEntry(session, 2, -1)
    if (typeof moved === 'string') throw new Error(moved)
    expect(moved.map((entry) => entry.exerciseId)).toEqual([
      'roll',
      'row',
      'bench',
      'curl',
      'pushdown',
    ])
    expect(moved.map((entry) => entry.order)).toEqual([0, 1, 2, 3, 4])
  })

  it('keeps the warm-up at the top', () => {
    expect(moveEntry(session, 1, -1)).toBe('warmup')
    expect(moveEntry(session, 0, 1)).toBe('warmup')
  })

  /* A pair is two neighbours by definition; moving a half breaks it. */
  it('does not move a superset half, or anything between them', () => {
    expect(moveEntry(session, 2, 1)).toBe('superset')
    expect(moveEntry(session, 3, -1)).toBe('superset')
  })

  it('stops at the ends', () => {
    expect(moveEntry(session, 4, 1)).toBe('edge')
  })
})
