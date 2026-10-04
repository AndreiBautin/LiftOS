import { describe, expect, it } from 'vitest'

import { asExerciseId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { entriesFromTemplate, isPlausibleTemplate, templateFrom } from './template'

const bench = asExerciseId('bench-press')
const curl = asExerciseId('dumbbell-curl')
const fly = asExerciseId('cable-fly')

const workout = aWorkout({
  title: 'Monday — Upper',
  entries: [
    anEntry({
      exerciseId: bench,
      role: 'strength',
      variant: 'Top set',
      sets: [aSet({ actualLoad: 225, actualReps: 5, notes: 'belt' }), aSet()],
    }),
    anEntry({ exerciseId: curl, superset: 'a', sets: [aSet()] }),
    // Every set skipped: not really part of the day.
    anEntry({ exerciseId: fly, sets: [aSet({ outcome: 'skipped' })] }),
  ],
})

describe('a session kept as a template', () => {
  const template = templateFrom(workout, '  Heavy upper  ', 't1', '2026-10-04T12:00:00Z')

  it('keeps the shape and drops every result', () => {
    expect(template.name).toBe('Heavy upper')
    expect(template.entries.map((entry) => entry.exerciseId)).toEqual([bench, curl])
    const [first] = template.entries
    expect(first?.variant).toBe('Top set')
    expect(first?.sets[0]).toEqual({ prescription: aSet().prescription, isWarmup: false })
    expect(template.entries[1]?.superset).toBe('a')
  })

  it('falls back to the session title for a blank name', () => {
    expect(templateFrom(workout, '   ', 't2', 'x').name).toBe('Monday — Upper')
  })

  it('opens as a session with every set pending and in order', () => {
    const entries = entriesFromTemplate(template)
    expect(entries.map((entry) => entry.order)).toEqual([0, 1])
    expect(entries.flatMap((entry) => entry.sets.map((set) => set.outcome))).toEqual([
      'pending',
      'pending',
      'pending',
    ])
    expect(entries[0]?.sets[0]?.actualLoad).toBeUndefined()
  })

  it('reads a stored template only when its shape holds', () => {
    expect(isPlausibleTemplate(JSON.parse(JSON.stringify(template)))).toBe(true)
    expect(isPlausibleTemplate({ ...template, entries: [{ exerciseId: 'x', role: 'main' }] })).toBe(
      false,
    )
    expect(isPlausibleTemplate({ ...template, name: 3 })).toBe(false)
  })
})
