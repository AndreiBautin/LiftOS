import type { ProgramDay, ProgramTemplate } from '@/domain/programs/program'
import { parseDay, shiftDay } from '@/domain/time/day'

/**
 * Which session a date holds, read off the calendar.
 *
 * **This replaced a cursor, and reverses a rule that stood since the
 * first commit.** The program used to be a queue: finishing or skipping a
 * session moved a stored position on by one, on the reasoning that two
 * predecessor apps keyed sessions to weekdays and "drifted permanently out
 * of step the first time a lifter missed a Tuesday". That was right while
 * a day was a slot in a generated week. It stopped being right when the
 * week became the lifter's own routine, written by weekday — Push A is a
 * Monday — at which point a missed Tuesday is simply a missed Tuesday,
 * and a queue that holds Pull A over until Wednesday is the drift.
 *
 * Asked for as _"the app knows what day it is and the workouts each map
 * to a day so we should use that rather than keeping a cursor"_. The
 * cursor was also the one record with no correct merge across devices —
 * it is what read Push A on a phone and Pull B on a desktop.
 *
 * **What is still stored is one date: the Monday the block began.** The
 * day comes from the weekday; the week of the block, and the cycle, come
 * from whole weeks since that Monday. It changes only when the lifter
 * says which week they are in, so two devices cannot disagree about it.
 */

/** Where a date falls in the program. */
interface ScheduledSlot {
  readonly cycleNumber: number
  readonly blockIndex: number
  readonly weekIndex: number
}

export interface ScheduledSession extends ScheduledSlot {
  readonly dayIndex: number
  readonly day: ProgramDay
  /** The day key the session is scheduled on. */
  readonly on: string
}

const DAY_MS = 86_400_000

/** Sunday-indexed, like `Date.getDay()`. */
function weekdayOfKey(key: string): number {
  return parseDay(key).getUTCDay()
}

/** The Monday of the week a day key falls in. */
export function mondayOf(key: string): string {
  return shiftDay(key, -((weekdayOfKey(key) + 6) % 7))
}

/**
 * The weekday a program day is run on.
 *
 * Stated by the split for the shipped routine. A day with none — a
 * generated week — is laid out from Monday in order, which is how the
 * labels of every generated split already read.
 */
function weekdayOf(day: ProgramDay): number {
  return day.weekday ?? (day.index + 1) % 7
}

/** Every week of the program in order, across blocks. */
function weeksOf(program: ProgramTemplate) {
  return program.blocks.flatMap((block, blockIndex) =>
    block.weeks.map((week, weekIndex) => ({ blockIndex, weekIndex, week })),
  )
}

/**
 * The week of the program a date falls in.
 *
 * Whole weeks since the block's Monday, wrapping into the next cycle once
 * the program has run through. A date before the block began reads as
 * its first week rather than as nothing — the anchor is a statement about
 * where the lifter is now, and the past is not what it is for.
 */
export function slotOn(
  program: ProgramTemplate,
  blockStartedOn: string,
  on: string,
): ScheduledSlot | undefined {
  const weeks = weeksOf(program)
  if (weeks.length === 0) return undefined

  const elapsed = Math.round(
    (parseDay(mondayOf(on)).getTime() - parseDay(mondayOf(blockStartedOn)).getTime()) / DAY_MS / 7,
  )
  const since = Math.max(0, elapsed)
  const here = weeks[since % weeks.length]
  if (here === undefined) return undefined

  return {
    cycleNumber: Math.floor(since / weeks.length) + 1,
    blockIndex: here.blockIndex,
    weekIndex: here.weekIndex,
  }
}

/**
 * Sessions moved to another day, for a week only: each entry says which
 * day's session a day holds instead of its own (`null` for none). Keyed by
 * day, so a move belongs to the dates it names and lapses with them —
 * nothing about the routine changes. See `moveSession`.
 */
export type DayMoves = Readonly<Record<string, string | null>>

/** The day whose scheduled session a date holds, once moves apply. */
function heldOn(on: string, moves: DayMoves | undefined): string | null {
  const moved = moves?.[on]
  return moved === undefined ? on : moved
}

/**
 * The session a date holds, or undefined on a rest day. A moved session
 * keeps everything about the day it was scheduled for — its week, its day
 * and so its title — and is dated where it now sits.
 */
export function sessionOn(
  program: ProgramTemplate,
  blockStartedOn: string,
  on: string,
  moves?: DayMoves,
): ScheduledSession | undefined {
  const from = heldOn(on, moves)
  if (from === null) return undefined
  const found = scheduledOn(program, blockStartedOn, from)
  return found === undefined ? undefined : { ...found, on }
}

/**
 * Moves the session a day holds to another day of the same week. If the
 * other day already holds one the two swap; otherwise the first day is
 * left empty. Composes with earlier moves, and drops an entry that has
 * come back to holding its own day. Refuses a move across weeks: a moved
 * session keeps its week, and a Monday session done on the next Tuesday
 * would be in two weeks at once.
 */
export function moveSession(
  program: ProgramTemplate,
  blockStartedOn: string,
  moves: DayMoves | undefined,
  from: string,
  to: string,
): DayMoves {
  const current = moves ?? {}
  if (from === to || mondayOf(from) !== mondayOf(to)) return current
  const moving = heldOn(from, moves)
  if (moving === null || scheduledOn(program, blockStartedOn, moving) === undefined) return current
  const there = heldOn(to, moves)
  const occupied = there !== null && scheduledOn(program, blockStartedOn, there) !== undefined
  const next: Record<string, string | null> = {
    ...current,
    [to]: moving,
    [from]: occupied ? there : null,
  }
  return tidy(program, blockStartedOn, next)
}

/** Drops entries that say nothing: a day holding its own session, or an empty rest day. */
function tidy(
  program: ProgramTemplate,
  blockStartedOn: string,
  next: Record<string, string | null>,
): DayMoves {
  const needed = ([day, held]: [string, string | null]) =>
    held === null ? scheduledOn(program, blockStartedOn, day) !== undefined : held !== day
  return Object.fromEntries(Object.entries(next).filter(needed))
}

/**
 * The week as it stands once every missed session has been carried
 * forward — **the default, not an offer**. Asked for as _"I feel like we
 * should make that the default unless I specifically want to skip… it's
 * still the Monday workout that I missed"_: a session that went by undone
 * is still owed, so it comes forward to today (tomorrow once something has
 * been trained today) and the rest of the week moves back behind it, the
 * way it would be rearranged by hand.
 *
 * Derived on every read from the stored moves, the clock and what is done,
 * never stored — so it follows the week day by day without a write, and a
 * carried session missed again simply carries again. **Skipping is a
 * stored move** (`null` on the missed day), which this then reads as
 * nothing owed. A carry that would run past Sunday is not made, and the
 * sessions stay missed: the week has no room, and which to drop is the
 * lifter's call.
 *
 * **Only a day after the first session ever filed can be missed**
 * (`trained.since`): a fresh install opened on a Wednesday would otherwise
 * owe Monday and Tuesday to somebody who was not using the app yet.
 *
 * `carried` is the first session brought forward — the one now offered
 * next — dated where it was missed, for the hero to say so and offer Skip.
 */
export function carryForward(
  program: ProgramTemplate,
  blockStartedOn: string,
  stored: DayMoves | undefined,
  today: string,
  done: readonly string[],
  trained: { readonly today: boolean; readonly since: string | undefined },
): { readonly moves: DayMoves | undefined; readonly carried?: ScheduledSession } {
  const missed = missedThisWeek(program, blockStartedOn, stored, today, done, trained.since)
  const [first] = missed
  if (first === undefined) return { moves: stored }
  const start = trained.today ? shiftDay(today, 1) : today
  const moves = catchUp(
    program,
    blockStartedOn,
    stored,
    missed.map((one) => one.on),
    start,
    done,
  )
  return moves === undefined ? { moves: stored } : { moves, carried: first }
}

/**
 * Sessions earlier this week that went by undone, in order — what
 * `carryForward` brings forward. `done` is the titles finished this
 * calendar week, matched the way `adherence` matches them, so a session
 * done early on another day is not missed. A day on or before `since`, the
 * first session ever filed, cannot be missed; with no history nothing can.
 */
export function missedThisWeek(
  program: ProgramTemplate,
  blockStartedOn: string,
  moves: DayMoves | undefined,
  today: string,
  done: readonly string[],
  since: string | undefined,
): readonly ScheduledSession[] {
  if (since === undefined) return []
  const missed: ScheduledSession[] = []
  for (let day = mondayOf(today); day < today; day = shiftDay(day, 1)) {
    const session = sessionOn(program, blockStartedOn, day, moves)
    if (day > since && session !== undefined && !done.includes(session.day.label)) {
      missed.push(session)
    }
  }
  return missed
}

/**
 * Brings missed sessions forward to `start`, in the order they were
 * missed, and pushes the rest of the week back behind them — each session
 * a day later only where it has to be, so the shift is absorbed by the
 * first rest day it meets.
 *
 * **Pushing, not swapping**, which is what separates it from
 * `moveSession`: swapping a missed session with today's would send
 * today's into the past, where it is missed instead. Upper A missed on
 * Monday of an upper, lower, rest, upper, lower week becomes Upper A on
 * Tuesday, Legs A on Wednesday, and Thursday and Friday as they were —
 * upper and lower still alternate.
 *
 * Sessions already done this week stay where they are. **Undefined when
 * the push would run past Sunday**: a moved session keeps its week.
 */
export function catchUp(
  program: ProgramTemplate,
  blockStartedOn: string,
  moves: DayMoves | undefined,
  missed: readonly string[],
  start: string,
  done: readonly string[] = [],
): DayMoves | undefined {
  const [first] = missed
  if (first === undefined) return undefined
  const sunday = shiftDay(mondayOf(first), 6)
  if (start > sunday || missed.some((day) => day >= start)) return undefined

  const queue: { readonly from: string; readonly source: string }[] = []
  for (const day of missed) {
    const source = heldOn(day, moves)
    if (source === null || scheduledOn(program, blockStartedOn, source) === undefined)
      return undefined
    queue.push({ from: day, source })
  }
  for (let day = start; day <= sunday; day = shiftDay(day, 1)) {
    const source = heldOn(day, moves)
    const session = source === null ? undefined : scheduledOn(program, blockStartedOn, source)
    if (source !== null && session !== undefined && !done.includes(session.day.label)) {
      queue.push({ from: day, source })
    }
  }

  const next: Record<string, string | null> = { ...moves }
  for (const item of queue) next[item.from] = null
  let cursor = start
  for (const item of queue) {
    const at = item.from > cursor ? item.from : cursor
    if (at > sunday) return undefined
    next[at] = item.source
    cursor = shiftDay(at, 1)
  }
  return tidy(program, blockStartedOn, next)
}

/** Moves only for this week and later; anything older has lapsed. */
export function liveMoves(moves: DayMoves | undefined, today: string): DayMoves | undefined {
  if (moves === undefined) return undefined
  const from = mondayOf(today)
  const kept = Object.entries(moves).filter(([day]) => day >= from)
  return kept.length === 0 ? undefined : Object.fromEntries(kept)
}

/** The session the routine itself puts on a date, before any move. */
function scheduledOn(
  program: ProgramTemplate,
  blockStartedOn: string,
  on: string,
): ScheduledSession | undefined {
  const slot = slotOn(program, blockStartedOn, on)
  if (slot === undefined) return undefined

  const week = program.blocks[slot.blockIndex]?.weeks[slot.weekIndex]
  const weekday = weekdayOfKey(on)
  const dayIndex = week?.days.findIndex((day) => weekdayOf(day) === weekday) ?? -1
  const day = week?.days[dayIndex]
  if (day === undefined) return undefined

  return { ...slot, dayIndex, day, on }
}

/**
 * The first scheduled session on or after a date.
 *
 * Bounded at a fortnight rather than a `while`: a program whose days name
 * no weekday at all would otherwise be searched forever.
 */
export function sessionFrom(
  program: ProgramTemplate,
  blockStartedOn: string,
  from: string,
  moves?: DayMoves,
): ScheduledSession | undefined {
  for (let offset = 0; offset < 14; offset += 1) {
    const found = sessionOn(program, blockStartedOn, shiftDay(from, offset), moves)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * The block start that puts a date in a given week of the program.
 *
 * What "I am in week three" writes, and how a stored position from the
 * cursor era is read: the Monday that many weeks back, counting earlier
 * cycles in full.
 */
export function blockStartFor(program: ProgramTemplate, slot: ScheduledSlot, on: string): string {
  const weeks = weeksOf(program)
  const offset = Math.max(
    0,
    weeks.findIndex(
      (week) => week.blockIndex === slot.blockIndex && week.weekIndex === slot.weekIndex,
    ),
  )
  const back = offset + weeks.length * Math.max(0, slot.cycleNumber - 1)
  return shiftDay(mondayOf(on), -7 * back)
}

/** A week of the calendar as the program fills it. */
interface WeekAhead {
  readonly monday: string
  readonly slot: ScheduledSlot
  readonly isDeload: boolean
  /** Monday to Sunday; `session` absent on a rest day. */
  readonly days: readonly { readonly on: string; readonly session?: ProgramDay }[]
}

/**
 * The weeks from this one on, as the calendar will hold them — where the
 * deload falls, and what each day is. The same `sessionOn` every other
 * screen asks, so the runway cannot promise a day the hero will not offer.
 */
export function weeksAhead(
  program: ProgramTemplate,
  blockStartedOn: string,
  today: string,
  count: number,
  moves?: DayMoves,
): readonly WeekAhead[] {
  const first = mondayOf(today)
  return Array.from({ length: count }, (_, at) => shiftDay(first, at * 7)).flatMap((monday) => {
    const slot = slotOn(program, blockStartedOn, monday)
    if (slot === undefined) return []
    const week = program.blocks[slot.blockIndex]?.weeks[slot.weekIndex]
    return [
      {
        monday,
        slot,
        isDeload: week?.isDeload === true,
        days: Array.from({ length: 7 }, (_, offset) => {
          const on = shiftDay(monday, offset)
          const session = sessionOn(program, blockStartedOn, on, moves)?.day
          return session === undefined ? { on } : { on, session }
        }),
      },
    ]
  })
}

/**
 * The week this calendar week must be set to so that the week holding
 * `on` becomes the first of the block — what skipping a deload asks for.
 *
 * Usually 0. On a rest day at the end of the week the next session falls
 * in the week after, and setting *this* week to the first would put that
 * one at the second; so it counts back from the session's own week,
 * wrapping into the block before (`(-ahead) mod length`).
 */
export function weekIndexToStartOn(on: string, today: string, weeksInBlock: number): number {
  if (weeksInBlock <= 0) return 0
  const ahead = Math.round(
    (parseDay(mondayOf(on)).getTime() - parseDay(mondayOf(today)).getTime()) / (7 * DAY_MS),
  )
  return ((-ahead % weeksInBlock) + weeksInBlock) % weeksInBlock
}
