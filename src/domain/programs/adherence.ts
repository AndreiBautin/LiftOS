import type { ProgramTemplate } from '@/domain/programs/program'
import { mondayOf, shiftDay } from '@/domain/time/day'

import { sessionOn, slotOn } from './schedule'

/**
 * How closely the block's weeks have followed the plan: each week a row,
 * each scheduled day done, missed, today or still ahead.
 *
 * **Asked the calendar's own question** — `sessionOn`, the one the hero
 * and the runway ask — so a day this calls missed is a day the app
 * offered. **Matched by title within the week**, the rule `doneTitles`
 * follows: Monday's session done early on a Friday is Monday done, not a
 * Friday extra and a missed Monday.
 *
 * Finished sessions only. A session with no scheduled title in its week
 * (freestyle, a repeat) is counted as `extra`, never as making up a
 * missed day — that would be the app deciding a curl session was a squat
 * day.
 */
export interface AdherenceDay {
  readonly on: string
  readonly title: string
  readonly state: 'done' | 'missed' | 'today' | 'ahead'
}

export interface AdherenceWeek {
  readonly monday: string
  /** Zero-based week of the block. */
  readonly weekIndex: number
  readonly isDeload: boolean
  readonly days: readonly AdherenceDay[]
  readonly done: number
  readonly planned: number
  readonly extra: number
}

export interface Adherence {
  readonly weeks: readonly AdherenceWeek[]
  /**
   * Weeks in a row with every scheduled session done, counted back from
   * the latest. **The week still running counts once it is complete and
   * does not break the run until it misses a day** — the streak rule the
   * hero follows, applied to whole weeks rather than any session.
   */
  readonly fullWeeks: number
  /** Scheduled sessions whose day has come, and how many were done. */
  readonly due: number
  readonly done: number
  readonly missed: readonly AdherenceDay[]
}

/** A finished session: the day it was filed on and its title. */
export interface FiledSession {
  readonly date: string
  readonly title: string
}

/** How far back the full-week run is counted. */
const STREAK_LIMIT = 104

function weekOf(
  program: ProgramTemplate,
  blockStartedOn: string,
  monday: string,
  filed: readonly FiledSession[],
  today: string,
): AdherenceWeek | undefined {
  const slot = slotOn(program, blockStartedOn, monday)
  if (slot === undefined) return undefined
  const sunday = shiftDay(monday, 6)
  const titles = filed
    .filter((one) => one.date >= monday && one.date <= sunday)
    .map((one) => one.title)
  const days = Array.from({ length: 7 }, (_, offset) => shiftDay(monday, offset)).flatMap(
    (on): AdherenceDay[] => {
      const session = sessionOn(program, blockStartedOn, on)
      if (session === undefined) return []
      const title = session.day.label
      const state = titles.includes(title)
        ? 'done'
        : on < today
          ? 'missed'
          : on === today
            ? 'today'
            : 'ahead'
      return [{ on, title, state }]
    },
  )
  const plannedTitles = new Set(days.map((day) => day.title))
  return {
    monday,
    weekIndex: slot.weekIndex,
    isDeload: program.blocks[slot.blockIndex]?.weeks[slot.weekIndex]?.isDeload === true,
    days,
    done: days.filter((day) => day.state === 'done').length,
    planned: days.length,
    extra: titles.filter((title) => !plannedTitles.has(title)).length,
  }
}

const complete = (week: AdherenceWeek) => week.planned > 0 && week.done === week.planned
const hasMiss = (week: AdherenceWeek) => week.days.some((day) => day.state === 'missed')

export function adherence(
  program: ProgramTemplate,
  blockStartedOn: string,
  filed: readonly FiledSession[],
  today: string,
  window: { readonly start: string; readonly weeks: number },
): Adherence {
  const thisMonday = mondayOf(today)
  const weeks = Array.from({ length: window.weeks }, (_, at) =>
    shiftDay(window.start, at * 7),
  ).flatMap((monday) => {
    const week = weekOf(program, blockStartedOn, monday, filed, today)
    return week === undefined ? [] : [week]
  })

  let fullWeeks = 0
  let cursor = thisMonday
  for (let step = 0; step < STREAK_LIMIT; step += 1) {
    const week = weekOf(program, blockStartedOn, cursor, filed, today)
    if (week === undefined) break
    if (complete(week)) fullWeeks += 1
    else if (cursor !== thisMonday || hasMiss(week)) break
    cursor = shiftDay(cursor, -7)
  }

  const days = weeks.flatMap((week) => week.days)
  const due = days.filter((day) => day.state === 'done' || day.state === 'missed')
  return {
    weeks,
    fullWeeks,
    due: due.length,
    done: due.filter((day) => day.state === 'done').length,
    missed: days.filter((day) => day.state === 'missed'),
  }
}
