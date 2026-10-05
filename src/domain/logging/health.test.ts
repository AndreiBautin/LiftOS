import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { dataHealth } from './health'

const NOW = new Date('2026-10-04T12:00:00Z')
const bench = asExerciseId('bench-press')
const ghost = asExerciseId('cable-crossover-v1')
// The builder's own default exercise is a back squat.
const known = new Set<string>(['bench-press', 'back-squat'])

const done = (id: string, startedAt: string, title = 'Upper') =>
  aWorkout({
    id: asWorkoutId(id),
    date: startedAt.slice(0, 10),
    startedAt,
    title,
    status: 'completed',
    entries: [anEntry({ exerciseId: bench, sets: [aSet(), aSet()] })],
  })

describe('the health of the history', () => {
  it('counts what is there', () => {
    const health = dataHealth(
      [
        done('a', '2026-09-01T18:00:00Z'),
        done('b', '2026-10-01T18:00:00Z'),
        aWorkout({ id: asWorkoutId('c'), status: 'abandoned' }),
      ],
      known,
      NOW,
    )
    expect(health.counts).toEqual({
      sessions: 2,
      abandoned: 1,
      sets: 4,
      first: '2026-09-01',
      last: '2026-10-01',
    })
    expect(health.findings).toEqual([])
  })

  it('finds a session left open a day, or a second one open', () => {
    const open = (id: string, startedAt: string) =>
      aWorkout({ id: asWorkoutId(id), startedAt, status: 'in-progress' })
    const fresh = dataHealth([open('now', '2026-10-04T11:00:00Z')], known, NOW)
    expect(fresh.findings).toEqual([])
    const stale = dataHealth(
      [open('now', '2026-10-04T11:00:00Z'), open('old', '2026-10-01T11:00:00Z')],
      known,
      NOW,
    )
    expect(stale.findings).toEqual([{ kind: 'left-open', workoutIds: ['old'] }])
  })

  it('finds a copy of a session, keeping the first', () => {
    const health = dataHealth(
      [done('a', '2026-10-01T18:00:00Z'), done('b', '2026-10-01T18:00:00Z')],
      known,
      NOW,
    )
    expect(health.findings).toEqual([{ kind: 'duplicate', workoutIds: ['b'] }])
  })

  it('finds a finished session with nothing done, and sets under an unknown exercise', () => {
    const empty = aWorkout({
      id: asWorkoutId('e'),
      status: 'completed',
      entries: [anEntry({ exerciseId: ghost, sets: [aSet({ outcome: 'pending' })] })],
    })
    expect(dataHealth([empty], known, NOW).findings).toEqual([
      { kind: 'empty', workoutIds: ['e'] },
      { kind: 'unknown-exercise', exerciseIds: [ghost] },
    ])
  })
})
