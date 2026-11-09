import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'
import { asExerciseId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import {
  barForNext,
  firstIncompleteIndex,
  loadToShow,
  nextStep,
  nextUp,
  restFor,
  runStart,
  warmupRun,
} from './player-steps'

const library = builtInExercises()
const pending = (plannedLoad?: number, plannedReps?: number) =>
  aSet({
    outcome: 'pending',
    ...(plannedLoad === undefined ? {} : { plannedLoad }),
    ...(plannedReps === undefined ? {} : { plannedReps }),
  })
const done = (actualLoad: number) => aSet({ outcome: 'completed', actualLoad, actualReps: 5 })
const warm = (slug: string) =>
  anEntry({ exerciseId: asExerciseId(slug), role: 'warmup', sets: [aSet({ outcome: 'pending' })] })

/*
 * The player's arithmetic, out of its component. None of it throws when
 * wrong — the player just opens on the wrong exercise, names the wrong
 * set while resting, or rests a minute too long — so these are the only
 * thing that would notice.
 */
describe('a run of warm-up rows', () => {
  const workout = aWorkout({
    entries: [warm('foam-roll'), warm('band-pull-apart'), anEntry({ role: 'strength' }), warm('x')],
  })

  it('is the whole run, from any row in it', () => {
    expect(warmupRun(workout, 1)).toEqual([0, 1])
    expect(runStart(workout, 1)).toBe(0)
  })

  it('is nothing for a working exercise, which stays where it is', () => {
    expect(warmupRun(workout, 2)).toBeUndefined()
    expect(runStart(workout, 2)).toBe(2)
  })

  it('is stepped past whole by Next, from any row in it', () => {
    // One past row 0 is row 1, which snaps back to row 0: Next went nowhere.
    expect(nextStep(workout, 0)).toBe(2)
    expect(nextStep(workout, 1)).toBe(2)
    expect(nextStep(workout, 2)).toBe(3)
  })
})

describe('where a session opens', () => {
  it('opens on the first exercise with anything left', () => {
    const workout = aWorkout({
      entries: [anEntry({ sets: [done(100)] }), anEntry({ sets: [pending(100, 5)] })],
    })
    expect(firstIncompleteIndex(workout)).toBe(1)
  })

  it('opens at the top once everything is settled', () => {
    expect(firstIncompleteIndex(aWorkout({ entries: [anEntry({ sets: [done(100)] })] }))).toBe(0)
  })
})

describe('what is on the bar', () => {
  it('is the next pending set’s plan', () => {
    expect(loadToShow([done(185), pending(190, 5)])).toBe(190)
  })

  it('is the last load lifted once nothing is pending, while it is stripped', () => {
    expect(loadToShow([done(185), done(190)])).toBe(190)
  })
})

/*
 * Read off the rest screen while loading the bar, so a wrong answer is a wrong
 * bar under a lifter, and nothing else on screen would disagree with it.
 */
describe('what the rest does to the bar', () => {
  const bench = asExerciseId('bench-press')
  const row = asExerciseId('pendlay-row')
  const lifted = { load: 210, exerciseId: bench }
  const barFor = (entries: Parameters<typeof aWorkout>[0]) =>
    barForNext(aWorkout(entries), 0, library, 'lb', [45, 35, 25, 10, 5, 2.5], lifted)

  it('leaves it alone for the same load', () => {
    expect(barFor({ entries: [anEntry({ exerciseId: bench, sets: [pending(210, 3)] })] })).toBe(
      'Bar stays loaded',
    )
  })

  it('names the plates a side for another load, the next exercise included', () => {
    expect(
      barFor({
        entries: [
          anEntry({ exerciseId: bench, sets: [done(210)] }),
          anEntry({ exerciseId: row, sets: [pending(160, 8)] }),
        ],
      }),
    ).toBe('45 · 10 · 2.5 a side')
  })

  it('says nothing for what is not a bar', () => {
    expect(
      barFor({
        entries: [anEntry({ exerciseId: asExerciseId('dips'), sets: [pending(0, 12)] })],
      }),
    ).toBeUndefined()
  })
})

describe('what the rest leads up to', () => {
  const bench = asExerciseId('bench-press')
  const dips = asExerciseId('dips')
  const nameOf = (id: string) => (id === 'dips' ? 'Dips' : 'Bench')

  it('names the set on this exercise, with its planned load and reps', () => {
    const workout = aWorkout({
      entries: [anEntry({ exerciseId: bench, sets: [done(185), pending(190, 5)] })],
    })
    expect(nextUp(workout, 0, nameOf, library, 'lb')).toEqual({
      title: 'Set 2',
      detail: '190 lb × 5',
    })
  })

  it('names the next exercise past this one, a bodyweight load as BW', () => {
    const workout = aWorkout({
      entries: [
        anEntry({ exerciseId: bench, sets: [done(185)] }),
        anEntry({ exerciseId: dips, sets: [pending(0, 12)] }),
      ],
    })
    expect(nextUp(workout, 0, nameOf, library, 'lb')).toEqual({ title: 'Dips', detail: 'BW × 12' })
  })

  it('is nothing at the end of the session', () => {
    const workout = aWorkout({ entries: [anEntry({ sets: [done(185)] })] })
    expect(nextUp(workout, 0, nameOf, library, 'lb')).toBeUndefined()
  })
})

describe('how long to rest', () => {
  const squat = anEntry({
    exerciseId: asExerciseId('low-bar-squat'),
    role: 'strength',
    sets: [done(300), pending(300, 5)],
  })
  const curl = anEntry({
    exerciseId: asExerciseId('db-curl'),
    role: 'assistance',
    sets: [pending(30, 15)],
  })

  it('rests for this lift between its own sets', () => {
    const workout = aWorkout({ entries: [squat, curl] })
    expect(restFor(workout, 0, 0, 5, library).reason).toBe('Heavy lift')
  })

  it('rests for the next exercise after the last set of this one', () => {
    const workout = aWorkout({ entries: [squat, curl] })
    expect(restFor(workout, 0, 1, 5, library).reason).toBe('Isolation')
  })

  it('adds time after a set that came up short', () => {
    const workout = aWorkout({ entries: [squat, curl] })
    const full = restFor(workout, 0, 0, 5, library).seconds
    const short = { ...squat, sets: [{ ...pending(300, 5) }, pending(300, 5)] }
    expect(restFor(aWorkout({ entries: [short, curl] }), 0, 0, 3, library).seconds).toBeGreaterThan(
      full,
    )
  })
})
