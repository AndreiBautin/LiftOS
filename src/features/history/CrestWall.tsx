import { Link } from 'react-router-dom'

import type { Exercise } from '@/domain/exercises/exercise'
import type { WorkoutId } from '@/domain/ids/ids'
import { sessionCrest } from '@/domain/logging/crest'
import type { SessionRecord } from '@/domain/logging/records'
import type { WorkoutLog } from '@/domain/logging/workout-log'

import { SessionCrest } from './SessionCrest'

/**
 * Every session as its crest, a month at a time — the history read as a
 * wall of emblems rather than a list of rows. A crest is cut by the
 * session's own exercises and turned its own way, so a run of the same
 * day still reads as distinct days; gold studs show where records fell.
 * Each opens its session. Drawn still: a wall of a hundred drawing in at
 * once would be noise.
 */
export function CrestWall({
  sessions,
  records,
  library,
}: {
  readonly sessions: readonly WorkoutLog[]
  readonly records: ReadonlyMap<WorkoutId, readonly SessionRecord[]>
  readonly library: readonly Exercise[]
}) {
  const months = new Map<string, WorkoutLog[]>()
  for (const workout of sessions) {
    const month = workout.date.slice(0, 7)
    months.set(month, [...(months.get(month) ?? []), workout])
  }

  return (
    <div className="space-y-5">
      {[...months.entries()].map(([month, workouts]) => (
        <section key={month} aria-label={monthName(month)}>
          <h3 className="text-ink-500 mb-2 text-xs tracking-[0.14em] uppercase">
            {monthName(month)} · {workouts.length}
          </h3>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {workouts.map((workout) => {
              const recordIds = new Set(
                (records.get(workout.id) ?? []).map((record) => record.exerciseId),
              )
              return (
                <li key={workout.id}>
                  <Link
                    viewTransition
                    to={`/session/${workout.id}`}
                    className="hover:bg-ink-850 flex flex-col items-center gap-1 rounded-xl p-1"
                    aria-label={`${workout.title}, ${dayLabel(workout.date)}`}
                  >
                    <SessionCrest
                      crest={sessionCrest(workout, recordIds)}
                      library={library}
                      className={workout.status === 'abandoned' ? 'w-full opacity-40' : 'w-full'}
                      still
                    />
                    <span className="text-ink-500 numeric text-[0.65rem]" aria-hidden>
                      {dayLabel(workout.date)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
