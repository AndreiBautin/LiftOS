import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'

import {
  deloadEmom,
  emomAt,
  emomCuesBetween,
  EMOM_START,
  lastEmom,
  nextEmom,
  plannedEmom,
  type EmomStep,
} from './emom'

const swing = asExerciseId('kb-swing')

function session(
  date: string,
  step: EmomStep,
  options: { readonly deload?: boolean; readonly done?: boolean } = {},
): WorkoutLog {
  return {
    id: asWorkoutId(date),
    date,
    startedAt: `${date}T18:00:00.000Z`,
    status: 'completed',
    title: 'Upper',
    entries: [
      {
        exerciseId: swing,
        role: 'conditioning',
        order: 0,
        sets: [
          {
            prescription: {
              load: { kind: 'working' },
              reps: { kind: 'emom', reps: step.reps, minutes: step.minutes },
            },
            plannedLoad: step.load,
            plannedReps: step.reps,
            ...(options.done === false ? {} : { actualLoad: step.load, actualReps: step.reps }),
            outcome: options.done === false ? 'pending' : 'completed',
            isWarmup: false,
          },
        ],
      },
    ],
    ...(options.deload === true ? { deload: true as const } : {}),
  }
}

describe('nextEmom', () => {
  it('adds a rep on the minute until thirty, at ten minutes always', () => {
    expect(nextEmom({ load: 60, reps: 10, minutes: 10 })).toEqual({
      load: 60,
      reps: 11,
      minutes: 10,
    })
    expect(nextEmom({ load: 60, reps: 29, minutes: 10 })).toEqual({
      load: 60,
      reps: 30,
      minutes: 10,
    })
  })

  /* "the only thing we progress is reps up to 30, then up the weight and reprogress" */
  it('then ten pounds on the bell and back to ten', () => {
    expect(nextEmom({ load: 60, reps: 30, minutes: 10 })).toEqual({
      load: 70,
      reps: 10,
      minutes: 10,
    })
  })

  it('pulls an old longer EMOM back to ten minutes', () => {
    expect(nextEmom({ load: 60, reps: 12, minutes: 11 })).toEqual({
      load: 60,
      reps: 13,
      minutes: 10,
    })
  })
})

describe('deloadEmom', () => {
  /* "i have a 30lb one, for deload lets just do that and keep the same reps" */
  it('runs the 30 lb bell at the same reps for the same ten minutes', () => {
    expect(deloadEmom({ load: 60, reps: 14, minutes: 10 })).toEqual({
      load: 30,
      reps: 14,
      minutes: 10,
    })
  })

  it('never goes heavier than the working bell', () => {
    expect(deloadEmom({ load: 25, reps: 14, minutes: 10 })).toEqual({
      load: 25,
      reps: 14,
      minutes: 10,
    })
  })
})

describe('plannedEmom', () => {
  it('opens at 60 lb, ten on the minute for ten minutes', () => {
    expect(plannedEmom([], swing, '2026-10-26', false)).toEqual(EMOM_START)
  })

  /*
   * The swings close every session, and the rule asked for is a rep a
   * week — so a second session in the same calendar week runs the same.
   */
  it('repeats inside a calendar week and climbs into the next', () => {
    const monday = [session('2026-10-26', EMOM_START)]
    expect(plannedEmom(monday, swing, '2026-10-30', false)).toEqual(EMOM_START)
    expect(plannedEmom(monday, swing, '2026-11-02', false)).toEqual({ ...EMOM_START, reps: 11 })
  })

  it('climbs from what was done, not what was planned', () => {
    const short: WorkoutLog = session('2026-10-26', { load: 60, reps: 14, minutes: 10 })
    const entry = short.entries[0]
    const set = entry?.sets[0]
    if (entry === undefined || set === undefined) throw new Error('fixture')
    const logged: WorkoutLog = {
      ...short,
      entries: [{ ...entry, sets: [{ ...set, actualReps: 12 }] }],
    }
    expect(plannedEmom([logged], swing, '2026-11-02', false)).toEqual({
      load: 60,
      reps: 13,
      minutes: 10,
    })
  })

  /*
   * As for the lifting: the deload is never last time, so the week after
   * picks up one rung past the working week before it.
   */
  it('deloads from the last working week and is read past by the week after', () => {
    const working = session('2026-10-26', { load: 60, reps: 14, minutes: 10 })
    expect(plannedEmom([working], swing, '2026-11-02', true)).toEqual({
      load: 30,
      reps: 14,
      minutes: 10,
    })

    const deloaded = session('2026-11-02', { load: 30, reps: 14, minutes: 10 }, { deload: true })
    expect(plannedEmom([deloaded, working], swing, '2026-11-09', false)).toEqual({
      load: 60,
      reps: 15,
      minutes: 10,
    })
  })

  it('ignores an EMOM that was never done', () => {
    const done = session('2026-10-19', EMOM_START)
    const pending = session('2026-10-26', { ...EMOM_START, reps: 11 }, { done: false })
    expect(lastEmom([pending, done], swing)?.date).toBe('2026-10-19')
  })
})

describe('emomAt', () => {
  it('reads the minute and the seconds left in it', () => {
    expect(emomAt(0, 10)).toEqual({ round: 1, secondsLeft: 60, done: false })
    expect(emomAt(59_001, 10)).toEqual({ round: 1, secondsLeft: 1, done: false })
    expect(emomAt(60_000, 10)).toEqual({ round: 2, secondsLeft: 60, done: false })
    expect(emomAt(599_500, 10)).toEqual({ round: 10, secondsLeft: 1, done: false })
  })

  it('is done at the end of the last minute', () => {
    expect(emomAt(600_000, 10)).toEqual({ round: 10, secondsLeft: 0, done: true })
  })
})

describe('emomCuesBetween', () => {
  it('ticks in the last three seconds of a minute and says go at the next', () => {
    expect(emomCuesBetween(56_900, 57_100, 10)).toEqual(['tick'])
    expect(emomCuesBetween(59_900, 60_100, 10)).toEqual(['go'])
    expect(emomCuesBetween(10_000, 10_250, 10)).toEqual([])
  })

  it('counts in to the first minute from below zero', () => {
    expect(emomCuesBetween(-3_500, -2_900, 10)).toEqual(['tick'])
    expect(emomCuesBetween(-200, 100, 10)).toEqual(['go'])
  })

  it('chimes at the end, not go', () => {
    expect(emomCuesBetween(599_900, 600_100, 10)).toEqual(['done'])
  })

  /* A phone unlocked mid-EMOM jumps several marks: one cue, never a burst. */
  it('sounds only the latest mark after a jump', () => {
    expect(emomCuesBetween(30_000, 200_000, 10)).toEqual(['go'])
    expect(emomCuesBetween(56_000, 59_500, 10)).toEqual([])
    expect(emomCuesBetween(300_000, 700_000, 10)).toEqual(['done'])
  })
})
