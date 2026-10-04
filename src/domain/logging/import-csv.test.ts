import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'

import { matchExercise, parseCsv, readTrainingExport } from './import-csv'

const STRONG = [
  'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  '2024-01-15 18:30:00,Push Day,1h 5m,Bench Press (Barbell),W,95,10,0,0,,,',
  '2024-01-15 18:30:00,Push Day,1h 5m,Bench Press (Barbell),1,185,5,0,0,"Paused, felt good",,',
  '2024-01-15 18:30:00,Push Day,1h 5m,Bench Press (Barbell),2,185,5,0,0,,,',
  '2024-01-15 18:30:00,Push Day,1h 5m,Lateral Raise (Dumbbell),1,20,15,0,0,,,',
  '2024-01-17 07:05:00,Legs,45m,Squat (Barbell),1,225,5,0,0,,,',
].join('\r\n')

const HEVY = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"Upper","15 Jan 2024, 18:30","15 Jan 2024, 19:42","","Bench Press (Barbell)","","","0","warmup","40","10","","",""',
  '"Upper","15 Jan 2024, 18:30","15 Jan 2024, 19:42","","Bench Press (Barbell)","","","1","normal","80","5","",""," "',
  '"Upper","15 Jan 2024, 18:30","15 Jan 2024, 19:42","","Pull Up","","","0","normal","","10","","",""',
].join('\n')

describe('reading another app’s export', () => {
  it('reads a Strong file into sessions, entries and sets', () => {
    const read = readTrainingExport(STRONG)
    if ('error' in read) throw new Error(read.error)
    expect(read.source).toBe('strong')
    expect(read.units).toBeUndefined()
    expect(read.sessions).toHaveLength(2)
    const [push] = read.sessions
    expect(push).toMatchObject({
      date: '2024-01-15',
      startedAt: '2024-01-15T18:30:00',
      completedAt: '2024-01-15T19:35:00',
      title: 'Push Day',
    })
    expect(push?.entries.map((entry) => [entry.name, entry.sets.length])).toEqual([
      ['Bench Press (Barbell)', 3],
      ['Lateral Raise (Dumbbell)', 1],
    ])
    expect(push?.entries[0]?.sets[0]).toEqual({ load: 95, reps: 10, warmup: true })
    expect(push?.entries[0]?.notes).toBe('Paused, felt good')
  })

  it('reads a Hevy file, taking its unit from the column', () => {
    const read = readTrainingExport(HEVY)
    if ('error' in read) throw new Error(read.error)
    expect(read).toMatchObject({ source: 'hevy', units: 'kg' })
    const [upper] = read.sessions
    expect(upper).toMatchObject({
      startedAt: '2024-01-15T18:30:00',
      completedAt: '2024-01-15T19:42:00',
    })
    expect(upper?.entries[0]?.sets[0]).toEqual({ load: 40, reps: 10, warmup: true })
    // A pull-up with no weight is the body alone, not a set of zero.
    expect(upper?.entries[1]?.sets[0]).toEqual({ reps: 10, warmup: false })
  })

  it('refuses a file in neither format, saying why', () => {
    const refused = readTrainingExport(['name,age', 'Ada,36'].join('\n'))
    expect('error' in refused ? refused.error : '').toContain('not a Strong or Hevy export')
    expect(readTrainingExport('')).toEqual({ error: 'The file is empty.' })
  })

  it('parses quotes, doubled quotes, a BOM and semicolons', () => {
    expect(parseCsv(String.fromCharCode(0xfeff) + 'a;b\n"x;y";"say ""hi"""')).toEqual([
      ['a', 'b'],
      ['x;y', 'say "hi"'],
    ])
  })
})

describe('matching another app’s exercise names', () => {
  const library = builtInExercises()

  it('reads the name outside the brackets and the equipment inside', () => {
    expect(matchExercise('Bench Press (Barbell)', library)?.id).toBe('bench-press')
    expect(matchExercise('Pull Up', library)?.id).toBe('pull-up')
  })

  /* A wrong guess files months of sets under the wrong lift. */
  it('guesses nothing rather than a near miss', () => {
    expect(matchExercise('Cable Crossover', library)).toBeUndefined()
    expect(matchExercise('', library)).toBeUndefined()
  })
})
