import { Link, Navigate, useParams } from 'react-router-dom'

import { useServices } from '@/app/context'
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, type MuscleGroup } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'
import { mondayOf, shiftDay, toDayKey } from '@/domain/time/day'
import { MUSCLE_WEEKS, muscleHistory } from '@/domain/volume/muscle-history'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardHeading } from '@/components/shared/primitives'
import { NIGGLE_LABELS, nigglesForMuscle, recentNiggles } from '@/domain/logging/niggles'
import { useExercises, useRecentWorkouts } from '@/features/train/hooks'

/**
 * One muscle, twelve weeks (`muscleHistory`): its sets as a tide — a
 * filled curve week by week, the busiest week marked — its share of all
 * the work, when it last worked, and the exercises that paid it, each
 * with a bar of its part.
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
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <PageHeader
        title={label}
        subtitle={
          history.lastDay === undefined
            ? 'Not trained yet'
            : `Last trained ${since(history.lastDay, today)}`
        }
      />

      <section className="hero-panel p-5 sm:p-6" aria-label={`${label} over twelve weeks`}>
        <dl className="grid grid-cols-3 gap-3">
          <Figure
            label="Sets"
            value={String(history.sets)}
            note={`${String(MUSCLE_WEEKS)} weeks`}
          />
          <Figure
            label="A week"
            value={(history.sets / MUSCLE_WEEKS).toFixed(1)}
            note="on average"
          />
          <Figure
            label="Share"
            value={`${String(Math.round(history.share * 100))}%`}
            note="of all sets"
          />
        </dl>
        <Tide weeks={history.weeks} today={today} />
      </section>

      {niggles.length > 0 && (
        <Card className="border-[oklch(0.78_0.15_85_/_0.35)]">
          <p className="text-sm text-[oklch(0.85_0.12_85)]">
            {niggles
              .map(
                (one) =>
                  `${NIGGLE_LABELS[one.region]} flagged ${one.count === 1 ? 'once' : one.count === 2 ? 'twice' : `${String(one.count)} times`} in three weeks`,
              )
              .join(' · ')}
          </p>
          <p className="text-ink-500 mt-1 text-xs">
            The work this muscle does loads that joint. On{' '}
            {niggles
              .flatMap((one) => one.exercises)
              .filter((one, at, all) => all.indexOf(one) === at)
              .map((one) => lookup(one)?.name ?? one)
              .join(', ')}
            .
          </p>
        </Card>
      )}
      <Card>
        <CardHeading title="What trained it" />
        {history.exercises.length === 0 ? (
          <p className="text-ink-500 text-sm">
            Nothing has trained the {label.toLowerCase()} in the last twelve weeks. The exercises
            appear here as their sets are logged.
          </p>
        ) : (
          <ul className="space-y-3">
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
                    className="from-accent-600 to-accent-400 block h-full rounded-full bg-gradient-to-r"
                    style={{ width: `${String((one.sets / most) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
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
      <defs>
        <linearGradient id="tide-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${line} L ${String(x(weeks.length - 1))} 86 L ${String(x(0))} 86 Z`}
        fill="url(#tide-fill)"
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
            className="fill-ink-50 text-[9px] font-semibold"
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
      <text x={x(0)} y={102} className="fill-ink-500 text-[8px]">
        12 weeks ago
      </text>
      <text x={x(weeks.length - 1)} y={102} textAnchor="end" className="fill-ink-500 text-[8px]">
        This week
      </text>
    </svg>
  )
}

function Figure({
  label,
  value,
  note,
}: {
  readonly label: string
  readonly value: string
  readonly note: string
}) {
  return (
    <div>
      <dt className="text-ink-500 text-[0.65rem] tracking-wide uppercase">{label}</dt>
      <dd className="numeric text-ink-50 mt-1 text-2xl font-semibold">{value}</dd>
      <dd className="text-ink-500 text-[0.7rem]">{note}</dd>
    </div>
  )
}

function since(day: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${String(days)} days ago`
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
