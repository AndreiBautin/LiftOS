import { describe, expect, it } from 'vitest'

import { asExerciseId, asWorkoutId } from '@/domain/ids/ids'
import { anEntry, aSet, aWorkout } from '@/test/builders/workout'

import { thenAndNow } from './then-now'
import type { WorkoutLog } from './workout-log'

const squat = asExerciseId('back-squat')
const curl = asExerciseId('dumbbell-curl')

let n = 0
const session = (
  date: string,
  entries: WorkoutLog['entries'],
  status: WorkoutLog['status'] = 'completed',
) =>
  aWorkout({
    id: asWorkoutId(`w${String((n += 1))}`),
    date,
    startedAt: `${date}T18:00:00`,
    status,
    entries,
  })
const squats = (load: number, reps: number) =>
  anEntry({
    exerciseId: squat,
    sets: [
      aSet({ actualLoad: load, actualReps: reps }),
      aSet({ actualLoad: load, actualReps: reps }),
    ],
  })

describe('each lift then and now', () => {
  const logs = [
    session('2026-06-01', [squats(225, 5)]),
    session('2026-06-08', [squats(235, 5)]),
    session('2026-06-27', [squats(245, 4)]), // inside the first four weeks
    session('2026-07-10', [squats(255, 5)]), // between: in neither window
    session('2026-09-20', [squats(305, 5)]),
    session('2026-09-23', [squats(305, 6)]),
    session('2026-09-27', [squats(310, 5)]),
    session('2026-10-01', [squats(310, 5)]),
    // A lift begun three weeks ago has no "then" apart from its "now".
    session('2026-09-15', [
      anEntry({ exerciseId: curl, sets: [aSet({ actualLoad: 30, actualReps: 12 })] }),
    ]),
  ]
  const result = thenAndNow(logs, '2026-10-04')

  it('reads its own first four weeks against the last four', () => {
    expect(result.map((one) => one.exerciseId)).toEqual([squat])
    const [row] = result
    expect(row?.then.top).toEqual({ load: 245, reps: 4 })
    expect(row?.now.top).toEqual({ load: 310, reps: 5 })
    expect(row?.then.sessionsPerWeek).toBe(0.75)
    expect(row?.now.sessionsPerWeek).toBe(1)
  })

  it('counts volume a week from working sets', () => {
    const [row] = result
    // 2 × (225×5 + 235×5 + 245×4) over four weeks.
    expect(row?.then.volumePerWeek).toBe((2 * (1125 + 1175 + 980)) / 4)
  })

  it('leaves out sessions that were not finished', () => {
    const open = [...logs, session('2026-10-03', [squats(400, 5)], 'in-progress')]
    expect(thenAndNow(open, '2026-10-04')[0]?.now.top).toEqual({ load: 310, reps: 5 })
  })
})
