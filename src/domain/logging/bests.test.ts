import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { bestsByExercise } from './bests'
import { estimateFromWorkout } from './workout-log'

const BENCH = asExerciseId('bench-press')

/* A heavier bell is a real record; a max read off ten reps a minute is not. */
describe('an EMOM on the wall', () => {
  it('keeps its bell as the best set and reads no estimated max', () => {
    const emom = aWorkout({
      entries: [
        anEntry({
          exerciseId: BENCH,
          sets: [
            aSet({
              actualLoad: 30,
              actualReps: 10,
              prescription: {
                load: { kind: 'rpe', target: 8 },
                reps: { kind: 'emom', reps: 10, minutes: 10 },
              },
            }),
          ],
        }),
      ],
    })
    const [best] = bestsByExercise([emom])
    expect(best?.heaviest.load).toBe(30)
    expect(best?.estimate).toBeUndefined()
    // The report and the trend read this one; it is what offered 40 lb as a basis.
    expect(estimateFromWorkout(emom, BENCH)).toBeUndefined()
  })
})

describe('all-time bests', () => {
  const older = aWorkout({
    id: asWorkoutId('a'),
    date: '2026-08-01',
    entries: [
      anEntry({
        exerciseId: BENCH,
        sets: [
          aSet({ actualLoad: 200, actualReps: 8 }),
          aSet({ isWarmup: true, actualLoad: 300, actualReps: 1 }),
        ],
      }),
    ],
  })
  const newer = aWorkout({
    id: asWorkoutId('b'),
    date: '2026-09-01',
    entries: [
      anEntry({
        exerciseId: BENCH,
        sets: [aSet({ actualLoad: 225, actualReps: 3 }), aSet({ actualLoad: 135, actualReps: 25 })],
      }),
    ],
  })

  const [bench] = bestsByExercise([older, newer])

  it('keeps the heaviest bar, and never a warm-up', () => {
    expect(bench?.heaviest).toMatchObject({ load: 225, reps: 3, date: '2026-09-01' })
  })

  /* 135 × 25 estimates higher than either, from a range the formula is not fitted for. */
  it('takes the estimate only from a reliable set', () => {
    expect(bench?.estimate?.load).not.toBe(135)
    expect(bench?.estimate?.value).toBeCloseTo(Math.max(200 * (1 + 8 / 30), 225 * (1 + 3 / 30)))
  })

  it('counts the sessions that trained it', () => {
    expect(bench?.sessions).toBe(2)
  })

  it('ignores a session still open', () => {
    const open = aWorkout({
      status: 'in-progress',
      entries: [anEntry({ exerciseId: BENCH, sets: [aSet({ actualLoad: 400, actualReps: 1 })] })],
    })
    expect(bestsByExercise([older, open])[0]?.heaviest.load).toBe(200)
  })
})
