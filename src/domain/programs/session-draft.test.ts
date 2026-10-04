import { describe, expect, it } from 'vitest'

import { asExerciseId, asSlotId } from '@/domain/ids/ids'

import type { ProgramDay, Slot, SlotRole } from './program'
import { applyDraft, EMPTY_DRAFT, moveInDraft, swapInDraft, toggleDropped } from './session-draft'

const slot = (id: string, role: SlotRole, exercise: string): Slot => ({
  id: asSlotId(id),
  role,
  exercise: { kind: 'specific', exerciseId: asExerciseId(exercise) },
  sets: [],
})

const day: ProgramDay = {
  index: 0,
  label: 'Monday — Upper',
  slots: [
    slot('w', 'warmup', 'roll-lats'),
    slot('a', 'strength', 'bench-press'),
    slot('b', 'hypertrophy', 'pendlay-row'),
    slot('c', 'hypertrophy', 'dumbbell-lateral-raise'),
  ],
}
const on = '2026-10-05'
const ids = (one: ProgramDay) => one.slots.map((s) => s.id)

describe('a draft of the next session', () => {
  it('drops, reorders and swaps, warm-ups staying first', () => {
    let draft = EMPTY_DRAFT(on)
    draft = toggleDropped(draft, 'c')
    draft = moveInDraft(day, draft, 'b', -1)
    draft = swapInDraft(day, draft, 'a', asExerciseId('paused-bench-press'))
    const edited = applyDraft(day, draft, on)
    expect(ids(edited)).toEqual(['w', 'b', 'a'])
    expect(edited.slots[2]?.exercise).toEqual({
      kind: 'specific',
      exerciseId: 'paused-bench-press',
    })
  })

  /* A draft made for Monday must not reshape Wednesday. */
  it('does nothing on a day it was not made for', () => {
    const draft = toggleDropped(EMPTY_DRAFT(on), 'a')
    expect(applyDraft(day, draft, '2026-10-07')).toBe(day)
  })

  it('clears a swap back to the slot’s own exercise, and brings a dropped one back', () => {
    let draft = swapInDraft(day, EMPTY_DRAFT(on), 'a', asExerciseId('paused-bench-press'))
    draft = swapInDraft(day, draft, 'a', asExerciseId('bench-press'))
    expect(draft.swaps).toEqual({})
    expect(toggleDropped(toggleDropped(draft, 'b'), 'b').dropped).toEqual([])
  })

  it('will not move a slot past either end', () => {
    const draft = EMPTY_DRAFT(on)
    expect(moveInDraft(day, draft, 'a', -1)).toBe(draft)
    expect(moveInDraft(day, draft, 'c', 1)).toBe(draft)
  })
})
