import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import type { ProgramPosition } from '@/domain/programs/position'
import { slotOn } from '@/domain/programs/schedule'
import type { PositionRepository } from '@/domain/repositories/ports'
import { DEFAULT_SETTINGS } from '@/domain/settings/settings'

import { deriveProgram, jumpToWeek } from './current-program'
import { blockStartOf } from './schedule'

const program = deriveProgram(DEFAULT_SETTINGS, builtInExercises())
const weeks = program.blocks[0]?.weeks.length ?? 0

function positionStore(initial?: ProgramPosition) {
  let stored = initial
  const position = {
    get: () => Promise.resolve(stored),
    save: (next: ProgramPosition) => {
      stored = next
      return Promise.resolve()
    },
  } as unknown as PositionRepository
  return { position, stored: () => stored }
}

/** A Wednesday, so "this week" and "the week starting today" differ. */
const wednesday = new Date('2026-10-14T09:00:00')
const clock = { now: () => wednesday }

/*
 * The week picker and "Skip the deload" both write here, and the write is
 * one date: the Monday the block began. Every screen then reads the week
 * off that date, so a Monday one week out is a whole block shifted —
 * the plan, the runway, the adherence card and the deload all wrong
 * together, with nothing on screen saying why.
 */
describe('saying which week of the block this is', () => {
  it.each([0, 1, weeks - 1])('makes today read as week %i, on today’s weekday', async (week) => {
    const store = positionStore()
    await jumpToWeek(program, week, { ...store, clock })

    const saved = store.stored()
    expect(saved).toBeDefined()
    const today = '2026-10-14'
    const here = slotOn(program, blockStartOf(program, saved, today), today)
    expect(here?.weekIndex).toBe(week)
  })

  it('writes a Monday as the block’s start', async () => {
    const store = positionStore()
    const moved = await jumpToWeek(program, 2, { ...store, clock })
    expect(new Date(`${moved.blockStartedOn ?? ''}T12:00:00`).getDay()).toBe(1)
  })

  it('keeps when the lifter first started', async () => {
    const startedAt = '2026-01-05T08:00:00.000Z'
    const store = positionStore({
      cycleNumber: 1,
      blockIndex: 0,
      weekIndex: 0,
      dayIndex: 0,
      startedAt,
    })
    const moved = await jumpToWeek(program, 1, { ...store, clock })
    expect(moved.startedAt).toBe(startedAt)
  })

  it('pulls a week past the block’s end back to its last week', async () => {
    const store = positionStore()
    const moved = await jumpToWeek(program, weeks + 5, { ...store, clock })
    expect(moved.weekIndex).toBe(weeks - 1)
  })
})
