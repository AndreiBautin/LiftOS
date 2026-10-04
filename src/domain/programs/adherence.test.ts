import { describe, expect, it } from 'vitest'

import { shiftDay as shift } from '@/domain/time/day'

import { adherence, type FiledSession } from './adherence'
import type { ProgramTemplate } from './program'

/* Monday, Wednesday and Friday; a three-week block whose last is the deload. */
const day = (label: string, weekday: number, index: number) => ({
  label,
  weekday,
  index,
  slots: [],
})
const week = (isDeload: boolean) => ({
  isDeload,
  days: [day('Squat', 1, 0), day('Bench', 3, 1), day('Pull', 5, 2)],
})
const PROGRAM = {
  blocks: [{ weeks: [week(false), week(false), week(true)] }],
} as unknown as ProgramTemplate

const START = '2026-09-14' // a Monday
const WINDOW = { start: START, weeks: 3 }

const all = (monday: string): FiledSession[] => [
  { date: monday, title: 'Squat' },
  { date: shift(monday, 2), title: 'Bench' },
  { date: shift(monday, 4), title: 'Pull' },
]

describe('how the block has followed the plan', () => {
  it('marks each scheduled day done, missed, today or ahead', () => {
    const filed = [...all('2026-09-14'), { date: '2026-09-21', title: 'Squat' }]
    const result = adherence(PROGRAM, START, filed, '2026-09-25', WINDOW)
    expect(result.weeks[0]?.days.map((one) => one.state)).toEqual(['done', 'done', 'done'])
    expect(result.weeks[1]?.days.map((one) => one.state)).toEqual(['done', 'missed', 'today'])
    expect(result.weeks[2]?.isDeload).toBe(true)
    expect(result.weeks[2]?.days.every((one) => one.state === 'ahead')).toBe(true)
    expect(result.missed.map((one) => one.on)).toEqual(['2026-09-23'])
    expect(result).toMatchObject({ due: 5, done: 4 })
  })

  /* Monday's session done early on Friday is Monday done. */
  it('matches a session to its day by title, not by the date it was done', () => {
    const filed = [{ date: '2026-09-18', title: 'Squat' }]
    const result = adherence(PROGRAM, START, filed, '2026-09-20', WINDOW)
    expect(result.weeks[0]?.days[0]?.state).toBe('done')
    expect(result.weeks[0]?.extra).toBe(0)
  })

  it('counts an unscheduled session as extra, never as making up a missed day', () => {
    const filed = [{ date: '2026-09-16', title: 'Arms' }]
    const result = adherence(PROGRAM, START, filed, '2026-09-20', WINDOW)
    expect(result.weeks[0]?.extra).toBe(1)
    expect(result.weeks[0]?.done).toBe(0)
  })

  it('counts full weeks in a row, the running week not breaking it until it misses', () => {
    const filed = [
      ...all('2026-09-14'),
      ...all('2026-09-21'),
      { date: '2026-09-28', title: 'Squat' },
    ]
    // Tuesday of the third week: nothing missed yet, so the run stands at two.
    expect(adherence(PROGRAM, START, filed, '2026-09-29', WINDOW).fullWeeks).toBe(2)
    // Thursday: Wednesday went by undone, so the run is broken.
    expect(adherence(PROGRAM, START, filed, '2026-10-01', WINDOW).fullWeeks).toBe(0)
    // Saturday with all three done: the running week counts.
    const finished = [...filed, ...all('2026-09-28').slice(1)]
    expect(adherence(PROGRAM, START, finished, '2026-10-03', WINDOW).fullWeeks).toBe(3)
  })
})
