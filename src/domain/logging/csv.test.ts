import { describe, expect, it } from 'vitest'

import { asExerciseId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { setsCsv } from './csv'

describe('the sets as CSV', () => {
  const { actualLoad: _load, actualReps: _reps, ...skipped } = aSet({ outcome: 'skipped' })
  const log = aWorkout({
    date: '2026-09-25',
    title: 'Friday — Legs B',
    entries: [
      anEntry({
        exerciseId: asExerciseId('front-squat'),
        sets: [aSet({ actualLoad: 175, actualReps: 6, notes: 'belt, "tight"' }), skipped],
      }),
    ],
  })
  const lines = setsCsv([log], () => 'Front Squat')
    .trimEnd()
    .split('\r\n')

  it('writes a header and a row a set', () => {
    expect(lines[0]).toBe('date,session,status,exercise,version,set,warm-up,outcome,load,reps,note')
    expect(lines).toHaveLength(3)
  })

  it('quotes a cell holding a comma or a quote, doubling the quote', () => {
    expect(lines[1]).toBe(
      '2026-09-25,Friday — Legs B,completed,Front Squat,,1,,completed,175,6,"belt, ""tight"""',
    )
  })

  it('keeps a skipped set, with no numbers', () => {
    expect(lines[2]).toBe('2026-09-25,Friday — Legs B,completed,Front Squat,,2,,skipped,,,')
  })

  it('leaves out a session still open', () => {
    const open = aWorkout({ status: 'in-progress' })
    expect(
      setsCsv([open], () => '')
        .trimEnd()
        .split('\r\n'),
    ).toHaveLength(1)
  })
})

/*
 * Notes and names are free text that can arrive from another app or the
 * sync file; opened in a spreadsheet, one starting with `=` would run.
 */
describe('a cell a spreadsheet would run as a formula', () => {
  const rowFor = (notes: string): string => {
    const log = aWorkout({
      date: '2026-09-25',
      title: 'Friday',
      entries: [
        anEntry({
          exerciseId: asExerciseId('front-squat'),
          sets: [aSet({ actualLoad: 175, actualReps: 6, notes })],
        }),
      ],
    })
    return setsCsv([log], () => 'Front Squat').split('\r\n')[1] ?? ''
  }

  it.each(['=HYPERLINK("http://x","y")', '+1+1', '-2+3', '@SUM(A1)', '\tx'])(
    'is shown as text when it begins %j',
    (notes) => {
      const row = rowFor(notes)
      const quoted = `,"'${notes.replace(/"/g, '""')}"`
      expect(row.endsWith(`,'${notes}`) || row.endsWith(quoted)).toBe(true)
    },
  )

  it('leaves ordinary text and numbers alone', () => {
    expect(rowFor('felt strong').endsWith(',felt strong')).toBe(true)
    expect(rowFor('-5').endsWith(',-5')).toBe(true)
  })
})
