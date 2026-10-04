import { Link } from 'react-router-dom'
import { useState } from 'react'

import type { Exercise } from '@/domain/exercises/exercise'
import { recordTimeline } from '@/domain/logging/record-timeline'
import { RECORD_LABELS } from '@/domain/logging/records'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { Card } from '@/components/shared/primitives'
import { cn } from '@/lib/cn'

/** Months drawn before "Older" is asked for. */
const SHOWN_MONTHS = 3
const GOLD = 'oklch(0.86 0.13 85)'

/**
 * The records as a history (`recordTimeline`): a gold spine down the
 * page, a month at a time, a node for each record with what it was, on
 * which exercise and on which day — the newest brightest, older ones
 * receding. Each links to its exercise and its session.
 *
 * **The wall says where you stand; this says how you got there.** A run of
 * records in one month and a quiet one after it is the shape of a block,
 * and it is invisible on a wall of bests.
 */
export function RecordTimeline({
  logs,
  library,
  units,
}: {
  readonly logs: readonly WorkoutLog[]
  readonly library: readonly Exercise[]
  readonly units: WeightUnit
}) {
  const [months, setMonths] = useState(SHOWN_MONTHS)
  const timeline = recordTimeline(logs)
  if (timeline.length === 0) {
    return (
      <Card>
        <p className="text-ink-300 text-sm">
          The first record lands the second time an exercise is beaten.
        </p>
      </Card>
    )
  }
  const shown = timeline.slice(0, months)
  let order = 0

  return (
    <Card>
      <ol className="relative ml-2">
        <span
          className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full"
          style={{ background: `linear-gradient(${GOLD}, transparent)` }}
          aria-hidden
        />
        {shown.map((month) => (
          <li key={month.month} className="pb-4 pl-5">
            <p className="text-ink-500 -ml-5 mb-2 flex items-center gap-2 text-xs tracking-[0.14em] uppercase">
              <span
                className="bg-ink-950 relative -left-[5px] size-3 rounded-full border-2"
                style={{ borderColor: GOLD }}
                aria-hidden
              />
              {monthName(month.month)} · {month.records.length}
            </p>
            <ul className="space-y-2.5">
              {month.records.map((record) => {
                const at = order++
                const name =
                  library.find((one) => one.id === record.exerciseId)?.name ?? record.exerciseId
                return (
                  <li
                    key={`${record.workoutId}-${record.exerciseId}`}
                    className="timeline-node relative"
                    style={{
                      opacity: Math.max(0.45, 1 - at * 0.04),
                      animationDelay: `${String(Math.min(at, 12) * 40)}ms`,
                    }}
                  >
                    <span
                      className={cn(
                        'absolute top-1.5 -left-[24px] rounded-full',
                        at === 0 ? 'size-2.5' : 'size-1.5',
                      )}
                      style={{ background: GOLD, left: at === 0 ? '-25px' : '-23px' }}
                      aria-hidden
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        viewTransition
                        to={`/exercise/${record.exerciseId}`}
                        className="text-ink-100 hover:text-accent-400 min-w-0 truncate text-sm font-medium"
                      >
                        {name}
                      </Link>
                      <span
                        className="numeric shrink-0 text-sm font-semibold"
                        style={{ color: GOLD }}
                      >
                        {record.set.load === undefined || record.set.load === 0
                          ? 'BW'
                          : formatLoad(record.set.load, units)}{' '}
                        × {record.set.reps ?? '—'}
                      </span>
                    </div>
                    <p className="text-ink-500 text-xs">
                      {RECORD_LABELS[record.kind]} ·{' '}
                      <Link
                        viewTransition
                        to={`/session/${record.workoutId}`}
                        className="hover:text-accent-400"
                      >
                        {dayLabel(record.date)}
                      </Link>
                    </p>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
      {months < timeline.length && (
        <button
          type="button"
          onClick={() => {
            setMonths((count) => count + SHOWN_MONTHS)
          }}
          className="text-accent-400 tap-target text-sm font-semibold"
        >
          Older months
        </button>
      )}
    </Card>
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
