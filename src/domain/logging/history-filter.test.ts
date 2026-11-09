import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { dayNameOf, filterHistory } from './history-filter'

const names: Record<string, string> = { 'front-squat': 'Front Squat', 'bench-press': 'Bench Press' }
const nameOf = (id: string) => names[id] ?? id

const legs = aWorkout({
  id: asWorkoutId('legs'),
  title: 'Friday — Legs B',
  notes: 'Left knee sore',
  entries: [anEntry({ exerciseId: asExerciseId('front-squat') })],
})
const upper = aWorkout({
  id: asWorkoutId('upper'),
  title: 'Monday — Upper',
  entries: [
    anEntry({ exerciseId: asExerciseId('bench-press'), sets: [aSet({ notes: 'paused' })] }),
    // On the plan and never done: not something this session "had".
    anEntry({ exerciseId: asExerciseId('front-squat'), sets: [aSet({ outcome: 'skipped' })] }),
  ],
})
const logs = [legs, upper]
const none = () => 0

describe('finding a session', () => {
  it('matches the day, an exercise done, or a note, whatever the case', () => {
    expect(filterHistory(logs, 'legs b', nameOf, none)).toEqual([legs])
    expect(filterHistory(logs, 'FRONT squat', nameOf, none)).toEqual([legs])
    expect(filterHistory(logs, 'knee', nameOf, none)).toEqual([legs])
    expect(filterHistory(logs, 'paused', nameOf, none)).toEqual([upper])
  })

  it('narrows with every word rather than widening', () => {
    expect(filterHistory(logs, 'squat paused', nameOf, none)).toEqual([])
  })

  /* "Records" is a word of the one search, and it narrows like any other. */
  it('reads "records" as sessions that set one, not as text to find', () => {
    const recordsIn = (id: string) => (id === 'legs' ? 2 : 0)
    expect(filterHistory(logs, 'records', nameOf, recordsIn)).toEqual([legs])
    expect(filterHistory(logs, 'PRs', nameOf, recordsIn)).toEqual([legs])
    expect(filterHistory(logs, 'records paused', nameOf, recordsIn)).toEqual([])
  })

  it('reads the day name off the title', () => {
    expect(dayNameOf('Friday — Legs B')).toBe('Legs B')
    expect(dayNameOf('Freestyle')).toBe('Freestyle')
  })
})
