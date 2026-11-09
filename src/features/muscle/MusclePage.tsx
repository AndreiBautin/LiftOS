import { Link, Navigate, useParams } from 'react-router-dom'

import { useServices } from '@/app/context'
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, type MuscleGroup } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'
import { mondayOf, shiftDay, toDayKey } from '@/domain/time/day'
import { MUSCLE_WEEKS, muscleHistory } from '@/domain/volume/muscle-history'
import { PageHeader } from '@/components/shared/PageHeader'
import { BodyHighlight } from '@/features/train/body-figures'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { DetailHero } from '@/components/shared/DetailHero'
import { Module } from '@/components/shared/Module'
import { NIGGLE_LABELS, nigglesForMuscle, recentNiggles } from '@/domain/logging/niggles'
import { useExercises, useRecentWorkouts } from '@/features/train/hooks'
import { formatDate } from '@/lib/format-date'

/**
 * One muscle, twelve weeks (`muscleHistory`): the figure and the tide first, a
 * filled curve week by week with the busiest marked, the way the exercise page
 * opens (`DetailHero`). Then the exercises that paid it, each with a bar of its
 * part.
 *
 * Reached from the body map's readout and the palette. **It counts what
 * every other screen counts**: a set pays the muscle its exercise is for,
 * so the page for the triceps lists what was programmed for the triceps,
 * not every press that moved an elbow.
 */
export function MusclePage() {
  const { id = '' } = useParams()
  const today = toDayKey(useServices().clock.now())
  const workouts = useRecentWorkouts(1000)
  const exercises = useExercises()

  if (!(MUSCLE_GROUPS as readonly string[]).includes(id)) return <Navigate to="/today" replace />
  const muscle = id as MuscleGroup
  const label = MUSCLE_GROUP_LABELS[muscle]

  if (workouts.data === undefined || exercises.data === undefined) {
    return <PageSkeleton title={label} />
  }

  const library = exercises.data
  const lookup = (exerciseId: ExerciseId) => library.find((one) => one.id === exerciseId)
  const history = muscleHistory(workouts.data, lookup, muscle, today)
  const most = Math.max(1, ...history.exercises.map((one) => one.sets))
  const niggles = nigglesForMuscle(recentNiggles(workouts.data, today), muscle)

  return (
    <div className="mx-auto max-w-2xl pb-8 lg:max-w-5xl">
      <PageHeader
        title={label}
        subtitle={
          history.lastDay === undefined
            ? 'Not trained yet'
            : `Last trained ${since(history.lastDay, today)}`
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-x-10">
        <div>
          <DetailHero
            label={`${label} over twelve weeks`}
            figure={String(history.sets)}
            unit={`sets in ${String(MUSCLE_WEEKS)} weeks`}
            facts={[
              { term: 'A week', value: (history.sets / MUSCLE_WEEKS).toFixed(1) },
              { term: 'Share', value: `${String(Math.round(history.share * 100))}%` },
            ]}
            aside={<BodyHighlight muscle={muscle} className="w-28 shrink-0" />}
          >
            <Tide weeks={history.weeks} today={today} />
          </DetailHero>

          {niggles.length > 0 && (
            <div className="mt-2 mb-4">
              <p className="text-warn-500 text-sm">
                {niggles
                  .map(
                    (one) =>
                      `${NIGGLE_LABELS[one.region]} flagged ${one.count === 1 ? 'once' : one.count === 2 ? 'twice' : `${String(one.count)} times`} in three weeks`,
                  )
                  .join(' · ')}
              </p>
              <p className="text-ink-500 mt-1 text-sm">
                The work this muscle does loads that joint. On{' '}
                {niggles
                  .flatMap((one) => one.exercises)
                  .filter((one, at, all) => all.indexOf(one) === at)
                  .map((one) => lookup(one)?.name ?? one)
                  .join(', ')}
                .
              </p>
            </div>
          )}
        </div>
        <Module title="What trained it">
          {history.exercises.length === 0 ? (
            <p className="text-ink-500 mt-1 text-sm">
              Nothing has trained the {label.toLowerCase()} in the last twelve weeks. The exercises
              appear here as their sets are logged.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {history.exercises.map((one) => (
                <li key={one.exerciseId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      viewTransition
                      to={`/exercise/${one.exerciseId}`}
                      className="text-ink-100 hover:text-accent-400 min-w-0 truncate text-sm"
                    >
                      {lookup(one.exerciseId)?.name ?? one.exerciseId}
                    </Link>
                    <span className="numeric text-ink-500 shrink-0 text-xs">
                      {one.sets} sets · {one.sessions} session{one.sessions === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="bg-ink-800 mt-1.5 block h-1.5 overflow-hidden rounded-full">
                    <span
                      className="bg-accent-500 block h-full rounded-full"
                      style={{ width: `${String((one.sets / most) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Module>
      </div>
    </div>
  )
}

/** The weeks as a filled curve, the busiest marked, this week's point lit. */
function Tide({ weeks, today }: { readonly weeks: readonly number[]; readonly today: string }) {
  const width = 320
  const height = 110
  const top = Math.max(4, ...weeks)
  const x = (at: number) => 8 + (at / (weeks.length - 1)) * (width - 16)
  const y = (sets: number) => 84 - (sets / top) * 66
  const points = weeks.map((sets, at) => [x(at), y(sets)] as const)
  // A smooth curve through the points: each segment a cubic with flat handles.
  const line = points
    .map(([px, py], at) => {
      if (at === 0) return `M ${String(px)} ${String(py)}`
      const [qx, qy] = points[at - 1] ?? [px, py]
      const mid = (qx + px) / 2
      return `C ${String(mid)} ${String(qy)}, ${String(mid)} ${String(py)}, ${String(px)} ${String(py)}`
    })
    .join(' ')
  const busiest = weeks.indexOf(Math.max(...weeks))
  const first = shiftDay(mondayOf(today), -7 * (weeks.length - 1))

  return (
    <svg viewBox={`0 0 ${String(width)} ${String(height)}`} className="mt-5 w-full" role="img">
      <title>
        {weeks
          .map((sets, at) => `Week of ${shiftDay(first, at * 7)}: ${String(sets)} sets`)
          .join('; ')}
      </title>
      <path
        d={`${line} L ${String(x(weeks.length - 1))} 86 L ${String(x(0))} 86 Z`}
        fill="var(--color-accent-500)"
        fillOpacity={0.16}
        className="tide-rise"
      />
      <path
        d={line}
        className="stroke-accent-400 line-draw fill-none"
        pathLength={1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {weeks[busiest] !== undefined && (weeks[busiest] ?? 0) > 0 && (
        <g>
          <circle cx={x(busiest)} cy={y(weeks[busiest] ?? 0)} r="3.5" className="fill-ink-50" />
          <text
            x={x(busiest)}
            y={y(weeks[busiest] ?? 0) - 8}
            textAnchor="middle"
            className="fill-ink-50 text-[11px] font-semibold"
          >
            {weeks[busiest]}
          </text>
        </g>
      )}
      <circle
        cx={x(weeks.length - 1)}
        cy={y(weeks.at(-1) ?? 0)}
        r="4"
        className="fill-accent-400"
      />
      <text x={x(0)} y={102} className="fill-ink-500 text-[11px]">
        12 weeks ago
      </text>
      <text x={x(weeks.length - 1)} y={102} textAnchor="end" className="fill-ink-500 text-[11px]">
        This week
      </text>
    </svg>
  )
}

function since(day: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${String(days)} days ago`
  return formatDate(new Date(`${day}T00:00:00`), {
    month: 'short',
    day: 'numeric',
  })
}
