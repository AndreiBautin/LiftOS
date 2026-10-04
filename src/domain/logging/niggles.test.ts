import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { isNiggleRegion, nigglesForMuscle, nigglesOnExercise, recentNiggles } from './niggles'
import type { WorkoutLog } from './workout-log'

const squat = asExerciseId('back-squat')
const lunge = asExerciseId('walking-lunge')
const bench = asExerciseId('bench-press')

const session = (id: string, date: string, entries: WorkoutLog['entries']) =>
  aWorkout({ id: asWorkoutId(id), date, startedAt: `${date}T18:00:00`, entries })

const logs = [
  session('a', '2026-09-01', [
    anEntry({ exerciseId: squat, sets: [aSet({ niggle: 'knee', notes: 'left knee, old' })] }),
  ]),
  session('b', '2026-09-20', [
    anEntry({ exerciseId: squat, sets: [aSet({ niggle: 'knee', notes: 'left knee' }), aSet()] }),
    anEntry({ exerciseId: lunge, sets: [aSet({ niggle: 'knee' })] }),
    anEntry({ exerciseId: bench, sets: [aSet({ niggle: 'shoulder' })] }),
  ]),
  session('c', '2026-09-25', [
    anEntry({ exerciseId: bench, sets: [aSet({ niggle: 'shoulder' })] }),
  ]),
]

describe('niggles lately', () => {
  const recent = recentNiggles(logs, '2026-10-04')

  it('counts each joint in the window, the most recent first', () => {
    expect(recent.map((one) => [one.region, one.count, one.lastDay])).toEqual([
      ['shoulder', 2, '2026-09-25'],
      // The one on the 1st is past three weeks and left out.
      ['knee', 2, '2026-09-20'],
    ])
  })

  it('names the exercises and the newest note', () => {
    const knee = recent.find((one) => one.region === 'knee')
    expect(knee?.exercises).toEqual([squat, lunge])
    expect(knee?.note).toBe('left knee')
  })

  it('reaches a muscle through the joint its work loads', () => {
    expect(nigglesForMuscle(recent, 'quads').map((one) => one.region)).toEqual(['knee'])
    expect(nigglesForMuscle(recent, 'chest').map((one) => one.region)).toEqual(['shoulder'])
    expect(nigglesForMuscle(recent, 'lats')).toEqual([])
  })

  it('finds the niggles noted on one exercise', () => {
    expect(nigglesOnExercise(recent, lunge).map((one) => one.region)).toEqual(['knee'])
  })

  it('reads only a known joint', () => {
    expect(isNiggleRegion('knee')).toBe(true)
    expect(isNiggleRegion('soul')).toBe(false)
  })
})
