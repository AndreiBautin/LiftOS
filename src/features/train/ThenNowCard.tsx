import { History } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { STRENGTH_LIFT_SLUGS } from '@/domain/exercises/catalogue'
import { thenAndNow, type Window } from '@/domain/logging/then-now'
import { parseDay, toDayKey } from '@/domain/time/day'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { Card, CardHeading } from '@/components/shared/primitives'
import { LIFT_COLOURS } from '@/features/charts/palette'

import { useExercises, useRecentWorkouts } from './hooks'

/** Rows shown: the competition lifts lead, then the most trained now. */
const ROWS = 5

const COLOUR_OF: Readonly<Record<string, string>> = {
  [STRENGTH_LIFT_SLUGS.squat]: LIFT_COLOURS.squat,
  [STRENGTH_LIFT_SLUGS.bench]: LIFT_COLOURS.bench,
  [STRENGTH_LIFT_SLUGS.deadlift]: LIFT_COLOURS.deadlift,
}

/**
 * Each lift's first four weeks against its last four (`thenAndNow`): a
 * row a lift, **a ghost bar behind a solid one** — the first month's top
 * bar drawn faint, this month's solid over it, both scaled to the lift
 * itself so a curl and a deadlift each fill their own row — with the top
 * sets, sessions a week and volume a week as then → now. The question it
 * answers is the one the line charts answer slowly: how far has this come
 * since it started. Silent until a lift has a first month apart from its
 * last.
 */
export function ThenNowCard() {
  const { settings } = useSettings()
  const today = toDayKey(useServices().clock.now())
  const workouts = useRecentWorkouts(2000)
  const exercises = useExercises()
  if (workouts.data === undefined || exercises.data === undefined) return null

  const library = exercises.data
  const rows = thenAndNow(workouts.data, today)
    .map((row) => ({ row, exercise: library.find((one) => one.id === row.exerciseId) }))
    .toSorted(
      (a, b) =>
        Number(b.exercise?.isCompetition === true) - Number(a.exercise?.isCompetition === true) ||
        b.row.now.sessionsPerWeek - a.row.now.sessionsPerWeek,
    )
    .slice(0, ROWS)
  if (rows.length === 0) return null
  const units = settings.units

  return (
    <Card>
      <CardHeading icon={<History size={16} aria-hidden />} title="Then and now" />
      <ul className="space-y-4">
        {rows.map(({ row, exercise }) => {
          const colour = COLOUR_OF[row.exerciseId] ?? 'var(--color-ink-300)'
          const thenLoad = row.then.top.load ?? 0
          const nowLoad = row.now.top.load ?? 0
          const scale = Math.max(thenLoad, nowLoad, 1)
          const loaded = scale > 1
          const volume =
            row.then.volumePerWeek > 0
              ? Math.round((row.now.volumePerWeek / row.then.volumePerWeek - 1) * 100)
              : undefined
          return (
            <li key={row.exerciseId}>
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  viewTransition
                  to={`/exercise/${row.exerciseId}`}
                  className="text-ink-100 hover:text-accent-400 min-w-0 truncate text-sm"
                >
                  {exercise?.name ?? row.exerciseId}
                </Link>
                <span className="text-ink-500 shrink-0 text-xs">
                  since {monthOf(row.then.from)}
                </span>
              </div>
              {loaded && (
                <div className="bg-ink-850 relative mt-1.5 h-2.5 overflow-hidden rounded-full">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full opacity-30"
                    style={{ width: `${String((thenLoad / scale) * 100)}%`, background: colour }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${String((nowLoad / scale) * 100)}%`,
                      background: colour,
                      // The ghost shows through where now has passed then.
                      maskImage: `linear-gradient(90deg, transparent ${String((thenLoad / scale) * 100)}%, black ${String((thenLoad / scale) * 100)}%)`,
                    }}
                  />
                </div>
              )}
              <dl className="numeric mt-1.5 grid grid-cols-[1.5fr_1fr_0.8fr] gap-2 text-xs">
                <Pair label="Top set" then={top(row.then, units)} now={top(row.now, units)} />
                <Pair
                  label="A week"
                  then={perWeek(row.then.sessionsPerWeek)}
                  now={perWeek(row.now.sessionsPerWeek)}
                />
                <div>
                  <dt className="text-ink-500">Volume</dt>
                  <dd className="text-ink-100">
                    {volume === undefined ? '—' : `${volume > 0 ? '+' : ''}${String(volume)}%`}
                  </dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Pair({
  label,
  then,
  now,
}: {
  readonly label: string
  readonly then: string
  readonly now: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-500">{label}</dt>
      <dd className="truncate">
        <span className="text-ink-500">{then}</span>
        <span className="text-ink-600"> → </span>
        <span className="text-ink-100">{now}</span>
      </dd>
    </div>
  )
}

function top(window: Window, units: WeightUnit): string {
  const load = window.top.load ?? 0
  return `${load > 0 ? formatLoad(load, units).replace(` ${units}`, '') : 'BW'}×${String(window.top.reps ?? '—')}`
}

function perWeek(sessions: number): string {
  return Number.isInteger(sessions) ? String(sessions) : sessions.toFixed(1)
}

function monthOf(day: string): string {
  return parseDay(day).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
