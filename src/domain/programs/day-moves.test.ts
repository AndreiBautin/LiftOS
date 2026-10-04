import { describe, expect, it } from 'vitest'

import type { ProgramTemplate } from './program'
import { liveMoves, moveSession, sessionFrom, sessionOn, weeksAhead } from './schedule'

/* Monday, Wednesday and Friday, the same every week. */
const day = (label: string, weekday: number, index: number) => ({
  label,
  weekday,
  index,
  slots: [],
})
const PROGRAM = {
  blocks: [
    {
      weeks: [
        { isDeload: false, days: [day('Squat', 1, 0), day('Bench', 3, 1), day('Pull', 5, 2)] },
      ],
    },
  ],
} as unknown as ProgramTemplate

const START = '2026-10-05' // a Monday
const MON = '2026-10-05'
const TUE = '2026-10-06'
const WED = '2026-10-07'
const THU = '2026-10-08'
const FRI = '2026-10-09'

const title = (on: string, moves?: Parameters<typeof sessionOn>[3]) =>
  sessionOn(PROGRAM, START, on, moves)?.day.label

describe('moving a session within its week', () => {
  it('moves a session onto a rest day and leaves its own day empty', () => {
    const moves = moveSession(PROGRAM, START, undefined, WED, THU)
    expect(title(WED, moves)).toBeUndefined()
    expect(title(THU, moves)).toBe('Bench')
    // Dated where it now sits, still the Wednesday session in every other respect.
    expect(sessionOn(PROGRAM, START, THU, moves)).toMatchObject({ on: THU, dayIndex: 1 })
  })

  it('swaps two days that both hold a session', () => {
    const moves = moveSession(PROGRAM, START, undefined, MON, WED)
    expect(title(MON, moves)).toBe('Bench')
    expect(title(WED, moves)).toBe('Squat')
  })

  it('composes with an earlier move, and moving back clears it', () => {
    const once = moveSession(PROGRAM, START, undefined, WED, THU)
    const twice = moveSession(PROGRAM, START, once, THU, TUE)
    expect([title(TUE, twice), title(WED, twice), title(THU, twice)]).toEqual([
      'Bench',
      undefined,
      undefined,
    ])
    expect(moveSession(PROGRAM, START, twice, TUE, WED)).toEqual({})
  })

  it('refuses a move across weeks, or from a day with nothing on it', () => {
    expect(moveSession(PROGRAM, START, undefined, FRI, '2026-10-12')).toEqual({})
    expect(moveSession(PROGRAM, START, undefined, TUE, THU)).toEqual({})
  })

  it('reaches the next-session search and the runway', () => {
    const moves = moveSession(PROGRAM, START, undefined, WED, THU)
    expect(sessionFrom(PROGRAM, START, TUE, moves)?.on).toBe(THU)
    const [week] = weeksAhead(PROGRAM, START, MON, 1, moves)
    expect(week?.days.map((one) => one.session?.label)).toEqual([
      'Squat',
      undefined,
      undefined,
      'Bench',
      'Pull',
      undefined,
      undefined,
    ])
  })

  it('lets moves for a past week lapse', () => {
    const moves = moveSession(PROGRAM, START, undefined, WED, THU)
    expect(liveMoves(moves, '2026-10-08')).toEqual(moves)
    expect(liveMoves(moves, '2026-10-13')).toBeUndefined()
  })
})
