import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'

import { deloadEmom, EMOM_START, lastEmom, nextEmom, plannedEmom, type EmomStep } from './emom'

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
  it('adds a rep on the minute until thirty', () => {
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

  it('then a minute, with the reps back at ten', () => {
    expect(nextEmom({ load: 60, reps: 30, minutes: 10 })).toEqual({
      load: 60,
      reps: 10,
      minutes: 11,
    })
    expect(nextEmom({ load: 60, reps: 30, minutes: 29 })).toEqual({
      load: 60,
      reps: 10,
      minutes: 30,
    })
  })

  it('and at 30 × 30, ten pounds on the bell and 10 × 10 again', () => {
    expect(nextEmom({ load: 60, reps: 30, minutes: 30 })).toEqual({
      load: 70,
      reps: 10,
      minutes: 10,
    })
  })
})

describe('deloadEmom', () => {
  /* "i dont have a 45lb kb" — the bell is the one thing a deload keeps. */
  it('keeps the bell and takes a quarter off the reps and a third off the minutes', () => {
    expect(deloadEmom({ load: 60, reps: 14, minutes: 12 })).toEqual({
      load: 60,
      reps: 10,
      minutes: 8,
    })
  })

  it('rounds down and keeps at least five of each', () => {
    expect(deloadEmom({ load: 70, reps: 10, minutes: 6 })).toEqual({
      load: 70,
      reps: 7,
      minutes: 5,
    })
    expect(deloadEmom({ load: 70, reps: 6, minutes: 6 })).toEqual({ load: 70, reps: 5, minutes: 5 })
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
    const working = session('2026-10-26', { load: 60, reps: 14, minutes: 12 })
    expect(plannedEmom([working], swing, '2026-11-02', true)).toEqual({
      load: 60,
      reps: 10,
      minutes: 8,
    })

    const deloaded = session('2026-11-02', { load: 60, reps: 10, minutes: 8 }, { deload: true })
    expect(plannedEmom([deloaded, working], swing, '2026-11-09', false)).toEqual({
      load: 60,
      reps: 15,
      minutes: 12,
    })
  })

  it('ignores an EMOM that was never done', () => {
    const done = session('2026-10-19', EMOM_START)
    const pending = session('2026-10-26', { ...EMOM_START, reps: 11 }, { done: false })
    expect(lastEmom([pending, done], swing)?.date).toBe('2026-10-19')
  })
})
