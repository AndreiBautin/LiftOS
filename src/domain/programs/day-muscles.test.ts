import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import { asExerciseId, asSlotId } from '@/domain/ids/ids'

import { dayMuscles } from './day-muscles'
import type { Slot, SlotRole } from './program'

const slot = (role: SlotRole, id: string): Slot => ({
  id: asSlotId(`${role}-${id}`),
  role,
  exercise: { kind: 'specific', exerciseId: asExerciseId(id) },
  sets: [],
})

describe('the muscles a day trains', () => {
  const library = builtInExercises()

  it('lists each working slot’s muscle once, in session order', () => {
    const day = {
      slots: [
        slot('warmup', 'roll-lats'),
        slot('strength', 'bench-press'),
        slot('hypertrophy', 'pendlay-row'),
        slot('hypertrophy', 'dumbbell-lateral-raise'),
        slot('conditioning', 'incline-walk'),
      ],
    }
    const muscles = dayMuscles(day, library)
    expect(muscles[0]).toBe('chest')
    expect(muscles).not.toContain('calves')
    expect(new Set(muscles).size).toBe(muscles.length)
  })
})
