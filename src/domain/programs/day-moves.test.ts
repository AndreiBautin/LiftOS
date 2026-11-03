import { describe, expect, it } from 'vitest'

import type { ProgramTemplate } from './program'
import {
  carryForward,
  catchUp,
  liveMoves,
  missedThisWeek,
  moveSession,
  sessionFrom,
  sessionOn,
  weeksAhead,
} from './schedule'

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

/* The shipped shape: upper, lower, rest, upper, lower. */
const SPLIT = {
  blocks: [
    {
      weeks: [
        {
          isDeload: false,
          days: [
            day('Upper A', 1, 0),
            day('Legs A', 2, 1),
            day('Upper B', 4, 2),
            day('Legs B', 5, 3),
          ],
        },
      ],
    },
  ],
} as unknown as ProgramTemplate

const week = (program: ProgramTemplate, moves?: Parameters<typeof sessionOn>[3]) =>
  Array.from({ length: 7 }, (_, at) => {
    const on = `2026-10-${String(5 + at).padStart(2, '0')}`
    return sessionOn(program, START, on, moves)?.day.label
  })

describe('catching up a missed session', () => {
  it('brings a missed Monday to Tuesday and pushes the week into the rest day', () => {
    const moves = catchUp(SPLIT, START, undefined, [MON], TUE)
    expect(week(SPLIT, moves)).toEqual([
      undefined,
      'Upper A',
      'Legs A',
      'Upper B',
      'Legs B',
      undefined,
      undefined,
    ])
  })

  it('moves only what has to move', () => {
    // Monday's squat on Tuesday leaves Wednesday's bench where it was.
    const moves = catchUp(PROGRAM, START, undefined, [MON], TUE)
    expect(week(PROGRAM, moves)).toEqual([
      undefined,
      'Squat',
      'Bench',
      undefined,
      'Pull',
      undefined,
      undefined,
    ])
  })

  it('leaves a session already done this week where it is', () => {
    const moves = catchUp(SPLIT, START, undefined, [MON], TUE, ['Legs A'])
    expect(week(SPLIT, moves).slice(0, 5)).toEqual([
      undefined,
      'Upper A',
      undefined,
      'Upper B',
      'Legs B',
    ])
  })

  it('refuses a push that would run past Sunday', () => {
    const weekend = {
      blocks: [
        {
          weeks: [
            {
              isDeload: false,
              days: [day('Fri', 5, 0), day('Sat', 6, 1), day('Sun', 0, 2)],
            },
          ],
        },
      ],
    } as unknown as ProgramTemplate
    expect(catchUp(weekend, START, undefined, [FRI], '2026-10-10')).toBeUndefined()
  })

  it('names the sessions earlier this week that went undone, in order', () => {
    const labels = (done: string[], since: string | undefined) =>
      missedThisWeek(SPLIT, START, undefined, WED, done, since).map((one) => one.day.label)
    const OLD = '2026-10-01'
    expect(labels([], OLD)).toEqual(['Upper A', 'Legs A'])
    expect(labels(['Upper A'], OLD)).toEqual(['Legs A'])
    expect(labels(['Upper A', 'Legs A'], OLD)).toEqual([])
    // Nothing is missed on or before the first session ever filed.
    expect(labels([], undefined)).toEqual([])
    expect(labels([], MON)).toEqual(['Legs A'])
    // Once caught up, nothing is missed.
    const moves = catchUp(SPLIT, START, undefined, [MON], TUE)
    expect(missedThisWeek(SPLIT, START, moves, TUE, [], '2026-10-01')).toEqual([])
  })
})

describe('carrying missed sessions forward by default', () => {
  const OLD = '2026-09-28' // trained the week before
  it('carries a missed Monday to Tuesday and says where it came from', () => {
    const { moves, carried } = carryForward(SPLIT, START, undefined, TUE, [], {
      today: false,
      since: OLD,
    })
    expect(week(SPLIT, moves).slice(0, 5)).toEqual([
      undefined,
      'Upper A',
      'Legs A',
      'Upper B',
      'Legs B',
    ])
    expect(carried).toMatchObject({ on: MON })
    expect(carried?.day.label).toBe('Upper A')
  })

  it('carries again when the carried session is missed too', () => {
    // Nothing done Monday or Tuesday: on Wednesday both are still owed, in order.
    const { moves } = carryForward(SPLIT, START, undefined, WED, [], { today: false, since: OLD })
    expect(week(SPLIT, moves)).toEqual([
      undefined,
      undefined,
      'Upper A',
      'Legs A',
      'Upper B',
      'Legs B',
      undefined,
    ])
  })

  it('waits for tomorrow once something was trained today', () => {
    // Legs A done on Tuesday as scheduled: Monday's Upper A comes on Wednesday.
    const { moves } = carryForward(SPLIT, START, undefined, TUE, ['Legs A'], {
      today: true,
      since: OLD,
    })
    expect(week(SPLIT, moves).slice(0, 5)).toEqual([
      undefined,
      'Legs A',
      'Upper A',
      'Upper B',
      'Legs B',
    ])
  })

  it('carries nothing that was skipped', () => {
    const skipped = { [MON]: null }
    const { moves, carried } = carryForward(SPLIT, START, skipped, TUE, [], {
      today: false,
      since: OLD,
    })
    expect(carried).toBeUndefined()
    expect(week(SPLIT, moves).slice(0, 5)).toEqual([
      undefined,
      'Legs A',
      undefined,
      'Upper B',
      'Legs B',
    ])
  })

  it('owes nothing to a lifter with no history', () => {
    const { carried } = carryForward(SPLIT, START, undefined, WED, [], {
      today: false,
      since: undefined,
    })
    expect(carried).toBeUndefined()
  })

  it('changes nothing for a week on schedule', () => {
    expect(
      carryForward(SPLIT, START, undefined, TUE, ['Upper A'], { today: false, since: OLD }),
    ).toEqual({
      moves: undefined,
    })
  })
})
