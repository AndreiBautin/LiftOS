import { describe, expect, it } from 'vitest'

import type { Exercise } from '@/domain/exercises/exercise'

import type { ProgramTemplate } from './program'
import { moveSession } from './schedule'
import { upcomingSessions } from './upcoming'

const sets = (working: number) => [
  { isWarmup: true },
  ...Array.from({ length: working }, () => ({})),
]
const PROGRAM = {
  blocks: [
    {
      weeks: [
        {
          isDeload: false,
          days: [
            {
              label: 'Monday — Squat',
              focus: 'Legs',
              weekday: 1,
              index: 0,
              slots: [
                { exercise: { kind: 'specific', exerciseId: 'squat' }, sets: sets(3) },
                { exercise: { kind: 'query', label: 'A calf raise' }, sets: sets(2) },
                { exercise: { kind: 'specific', exerciseId: 'gone' }, sets: [{ isWarmup: true }] },
              ],
            },
            { label: 'Wednesday — Bench', weekday: 3, index: 1, slots: [] },
          ],
        },
      ],
    },
  ],
} as unknown as ProgramTemplate
const EXERCISES = [{ id: 'squat', name: 'Low Bar Squat' }] as unknown as Exercise[]
const START = '2026-10-05' // a Monday

describe('the sessions the sync file carries ahead', () => {
  it('names each scheduled day, its exercises and their working sets', () => {
    expect(upcomingSessions(PROGRAM, START, START, EXERCISES)).toEqual([
      {
        date: '2026-10-05',
        title: 'Monday — Squat',
        focus: 'Legs',
        exercises: [
          { name: 'Low Bar Squat', sets: 3 },
          { name: 'A calf raise', sets: 2 },
        ],
      },
      { date: '2026-10-07', title: 'Wednesday — Bench', exercises: [] },
    ])
  })

  /* A week from a Thursday reaches the next Monday and no further. */
  it('looks seven days ahead from today', () => {
    expect(upcomingSessions(PROGRAM, START, '2026-10-08', EXERCISES).map((s) => s.date)).toEqual([
      '2026-10-12',
      '2026-10-14',
    ])
  })

  it('puts a moved session where the hero puts it', () => {
    const moves = moveSession(PROGRAM, START, undefined, '2026-10-07', '2026-10-06')
    expect(
      upcomingSessions(PROGRAM, START, START, EXERCISES, moves).map((s) => [s.date, s.title]),
    ).toEqual([
      ['2026-10-05', 'Monday — Squat'],
      ['2026-10-06', 'Wednesday — Bench'],
    ])
  })
})
