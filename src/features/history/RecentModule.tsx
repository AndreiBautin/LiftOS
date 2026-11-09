import { Star } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link } from 'react-router-dom'

import { Module } from '@/components/shared/Module'
import { Skeleton } from '@/components/shared/Skeleton'
import { sessionRecords } from '@/domain/logging/records'
import { parseDay } from '@/domain/time/day'
import { useRecentWorkouts } from '@/features/train/hooks'
import { splitDayLabel } from '@/features/train/useNextSession'
import { formatDate } from '@/lib/format-date'
import { lazyNamed } from '@/lib/lazy-named'

/** Enough of the past to say "All 62 sessions" and to read each one's records. */
const WINDOW = 2000
const SHOWN = 3

/**
 * The last few sessions, a line each. **The whole history is a press away**,
 * with its search, its filters and its crests, because looking something up is
 * the exception: most days the question is only what the last session was.
 */
export function RecentModule() {
  const workouts = useRecentWorkouts(WINDOW)
  const [all, setAll] = useState(false)

  if (workouts.data === undefined) return null
  const sessions = workouts.data.filter((log) => log.status !== 'in-progress')
  const records = sessionRecords(workouts.data)

  return (
    <Module title="Recent">
      {all ? (
        <div className="mt-2">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <TrainingHistory />
          </Suspense>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-ink-500 mt-1 text-sm">Finished sessions are kept here.</p>
      ) : (
        <>
          <ul>
            {sessions.slice(0, SHOWN).map((log) => {
              const count = records.get(log.id)?.length ?? 0
              return (
                <li key={log.id} className="border-ink-800 border-b">
                  <Link
                    viewTransition
                    to={`/session/${log.id}`}
                    className="flex min-h-[3.25rem] items-center justify-between gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{splitDayLabel(log.title).name}</span>
                      {count > 0 && (
                        <span
                          className="text-gold-400 numeric flex shrink-0 items-center gap-0.5 text-[0.8125rem]"
                          aria-label={`${String(count)} ${count === 1 ? 'record' : 'records'}`}
                        >
                          <Star size={12} fill="currentColor" aria-hidden />
                          {count}
                        </span>
                      )}
                    </span>
                    <span className="numeric text-ink-500 shrink-0 text-[0.8125rem]">
                      {formatDate(parseDay(log.date), {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAll(true)
            }}
            className="text-accent-400 tap-target mt-1 text-sm font-medium"
          >
            All {sessions.length} sessions
          </button>
        </>
      )}
    </Module>
  )
}

const TrainingHistory = lazyNamed(() => import('./TrainingHistory'), 'TrainingHistory')
