import { describe, expect, it } from 'vitest'

import type { ExerciseId, WorkoutId } from '@/domain/ids/ids'
import type { LogEntry, WorkoutLog } from '@/domain/logging/workout-log'

import { measuredMaxes, sbdSummary, strengthTrend } from './trend'
import { strengthStandings } from './standards'

function entry(slug: string, load: number, reps: number): LogEntry {
  return {
    exerciseId: slug as ExerciseId,
    role: 'strength',
    order: 0,
    sets: [
      {
        prescription: { load: { kind: 'working' }, reps: { kind: 'range', low: 3, high: 5 } },
        plannedLoad: load,
        plannedReps: reps,
        actualLoad: load,
        actualReps: reps,
        outcome: 'completed',
        isWarmup: false,
      },
    ],
  }
}

function log(
  date: string,
  entries: LogEntry[],
  status: WorkoutLog['status'] = 'completed',
): WorkoutLog {
  return {
    id: date as WorkoutId,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    status,
    title: 'x',
    entries,
  }
}

describe('the strength trend', () => {
  it('plots each lift in date order, however the logs arrive', () => {
    const trend = strengthTrend([
      log('2026-09-10', [entry('low-bar-squat', 245, 5)]),
      log('2026-09-01', [entry('low-bar-squat', 235, 5)]),
    ])

    expect(trend.squat.map((point) => point.date)).toEqual(['2026-09-01', '2026-09-10'])
    expect(trend.squat[1]?.value).toBeGreaterThan(trend.squat[0]?.value ?? Infinity)
    expect(trend.bench).toEqual([])
  })

  /*
   * The report never read an abandoned session, and a set of twenty is
   * outside what the formula was fitted for — plotting either would put
   * a point on the line the app never stood behind.
   */
  it('leaves out abandoned sessions and unreliable estimates', () => {
    const trend = strengthTrend([
      log('2026-09-01', [entry('bench-press', 185, 5)], 'abandoned'),
      log('2026-09-03', [entry('bench-press', 95, 20)]),
      log('2026-09-05', [entry('bench-press', 190, 5)]),
    ])

    expect(trend.bench.map((point) => point.date)).toEqual(['2026-09-05'])
  })
})

describe('the measured maxes', () => {
  const squat = 'low-bar-squat' as ExerciseId

  it('reads each lift off its most recent finished session', () => {
    const measured = measuredMaxes(
      [
        log('2026-09-01', [entry('low-bar-squat', 300, 5)]),
        log('2026-09-10', [entry('low-bar-squat', 250, 5)]),
      ],
      () => false,
    )

    expect(measured[squat]).toBe(Math.round(250 * (1 + 5 / 30)))
  })

  it('skips a deload session and reads the one before it', () => {
    const measured = measuredMaxes(
      [
        log('2026-09-01', [entry('low-bar-squat', 300, 5)]),
        log('2026-09-10', [entry('low-bar-squat', 200, 5)]),
      ],
      (one) => one.date === '2026-09-10',
    )

    expect(measured[squat]).toBe(Math.round(300 * (1 + 5 / 30)))
  })

  it('leaves a lift absent when no session has measured it', () => {
    const measured = measuredMaxes(
      [log('2026-09-01', [entry('low-bar-squat', 300, 5)])],
      () => false,
    )

    expect(measured['bench-press' as ExerciseId]).toBeUndefined()
  })
})

describe('a step up the bar', () => {
  const squat = 'low-bar-squat'

  it('never reads as weaker when the reps reset', () => {
    const trend = strengthTrend([
      log('2026-09-01', [entry(squat, 225, 10)]),
      log('2026-09-08', [entry(squat, 235, 5)]),
    ])
    expect(trend.squat[1]?.value).toBe(trend.squat[0]?.value)
    expect(
      measuredMaxes(
        [log('2026-09-01', [entry(squat, 225, 10)]), log('2026-09-08', [entry(squat, 235, 5)])],
        () => false,
      )[squat as ExerciseId],
    ).toBe(trend.squat[0]?.value)
  })

  it('still reads a worse session at the same bar as lower', () => {
    const trend = strengthTrend([
      log('2026-09-01', [entry(squat, 225, 8)]),
      log('2026-09-08', [entry(squat, 225, 5)]),
    ])
    expect(trend.squat[1]?.value).toBeLessThan(trend.squat[0]?.value ?? 0)
  })
})

describe('the SBD summary', () => {
  const logs = [
    log('2026-09-01', [
      entry('low-bar-squat', 300, 5),
      entry('bench-press', 200, 3),
      entry('sumo-deadlift', 400, 2),
    ]),
    log('2026-09-10', [entry('low-bar-squat', 200, 5)]),
  ]
  const isDeload = (one: WorkoutLog): boolean => one.date === '2026-09-10'
  const stored = { ['bench-press' as ExerciseId]: 999 }

  // The sync file carries this number; the hero banner shows the other.
  it('totals exactly what the hero banner totals', () => {
    const summary = sbdSummary(logs, isDeload, stored)
    const { total } = strengthStandings({
      estimatedMaxes: { ...stored, ...measuredMaxes(logs, isDeload) },
    })

    expect(summary.total).toBe(total.max)
    expect(summary.lifts[0]).toMatchObject({ lift: 'squat', measuredOn: '2026-09-01' })
  })

  it('falls back to the stored max and says so', () => {
    const summary = sbdSummary([], () => false, stored)

    expect(summary.lifts[1]).toMatchObject({ max: 999, measuredOn: null })
    expect(summary.total).toBeUndefined()
  })
})
