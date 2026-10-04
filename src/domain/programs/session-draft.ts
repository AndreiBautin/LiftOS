import type { ExerciseId } from '@/domain/ids/ids'

import type { ProgramDay, Slot } from './program'

/**
 * Edits to the next session made before it is started: exercises dropped,
 * reordered or swapped, for that one session.
 *
 * **Keyed to the day it was made for** (`on`, a day key): a draft for
 * Monday must not reshape Wednesday, so a draft whose day has passed or
 * moved is simply not applied. **By slot id**, which is stable because the
 * program is derived deterministically — an index would point at a
 * different exercise the moment one was dropped.
 *
 * The program itself is never touched (the program is never the log, and
 * the routine is the lifter's own): this is one session's change of mind.
 */
export interface SessionDraft {
  readonly on: string
  /** Working slots in the order to run them; any not named keep their place after. */
  readonly order: readonly string[]
  readonly dropped: readonly string[]
  /** Slot id → the exercise to do in its place. */
  readonly swaps: Readonly<Record<string, ExerciseId>>
}

export const EMPTY_DRAFT = (on: string): SessionDraft => ({ on, order: [], dropped: [], swaps: {} })

/** Whether a draft changes anything. */
export function isEmptyDraft(draft: SessionDraft): boolean {
  return (
    draft.order.length === 0 && draft.dropped.length === 0 && Object.keys(draft.swaps).length === 0
  )
}

/**
 * The day with a draft applied, or the day as it was when the draft is for
 * another day. **Warm-ups stay first and are never edited** — a session
 * reordered so the warm-up came after the bench would be no warm-up.
 */
export function applyDraft(
  day: ProgramDay,
  draft: SessionDraft | undefined,
  on: string,
): ProgramDay {
  if (draft?.on !== on || isEmptyDraft(draft)) return day
  const warmups = day.slots.filter((slot) => slot.role === 'warmup')
  const working = day.slots
    .filter((slot) => slot.role !== 'warmup' && !draft.dropped.includes(slot.id))
    .map((slot): Slot => {
      const swap = draft.swaps[slot.id]
      return swap === undefined || slot.exercise.kind !== 'specific'
        ? slot
        : { ...slot, exercise: { kind: 'specific', exerciseId: swap } }
    })
  const rank = (slot: Slot) => {
    const at = draft.order.indexOf(slot.id)
    return at === -1 ? Number.MAX_SAFE_INTEGER : at
  }
  // A stable sort, so slots the order does not name keep their own order.
  const ordered = working.toSorted((a, b) => rank(a) - rank(b))
  return { ...day, slots: [...warmups, ...ordered] }
}

/** Moves a working slot one place up or down, returning the new draft. */
export function moveInDraft(
  day: ProgramDay,
  draft: SessionDraft,
  slotId: string,
  by: -1 | 1,
): SessionDraft {
  const current = applyDraft(day, draft, draft.on)
    .slots.filter((slot) => slot.role !== 'warmup')
    .map((slot): string => slot.id)
  const at = current.indexOf(slotId)
  const to = at + by
  if (at === -1 || to < 0 || to >= current.length) return draft
  const next = [...current]
  next.splice(at, 1)
  next.splice(to, 0, slotId)
  return { ...draft, order: next }
}

/** Drops a slot, or brings it back. */
export function toggleDropped(draft: SessionDraft, slotId: string): SessionDraft {
  return {
    ...draft,
    dropped: draft.dropped.includes(slotId)
      ? draft.dropped.filter((one) => one !== slotId)
      : [...draft.dropped, slotId],
  }
}

/** Swaps a slot's exercise; the slot's own exercise clears the swap. */
export function swapInDraft(
  day: ProgramDay,
  draft: SessionDraft,
  slotId: string,
  exerciseId: ExerciseId,
): SessionDraft {
  const original = day.slots.find((slot) => slot.id === slotId)?.exercise
  const { [slotId]: _cleared, ...rest } = draft.swaps
  const back = original?.kind === 'specific' && original.exerciseId === exerciseId
  return { ...draft, swaps: back ? rest : { ...rest, [slotId]: exerciseId } }
}
