import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useServices } from '@/app/context'
import { MUSCLE_GROUP_LABELS } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'
import { mondayOf, parseDay, toDayKey } from '@/domain/time/day'
import { muscleYear } from '@/domain/volume/muscle-year'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Card } from '@/components/shared/primitives'
import { useExercises, useProgram, useRecentWorkouts } from '@/features/train/hooks'

/** One cell's width and a row's height, in the strip's own units. */
const CELL = 10
const ROW = 12
const DELOAD = 'oklch(0.72 0.14 285)'

/**
 * Every muscle across a year (`muscleYear`): a row a muscle, a cell a
 * calendar week, lit by its working sets against the busiest muscle-week
 * of the year — **a landscape, not a chart**, read for its shape: which
 * muscles run as unbroken bands, which come and go, and where the whole
 * column goes quiet. Deload weeks are a violet band behind the column,
 * found from each session's own logged position rather than from today's
 * block, so a deload taken in March is still marked after the block moved.
 * A row's name opens that muscle's page.
 */
export function MuscleYearPage() {
  const today = toDayKey(useServices().clock.now())
  const { year = today.slice(0, 4) } = useParams()
  const workouts = useRecentWorkouts(2000)
  const exercises = useExercises()
  const program = useProgram()

  if (workouts.data === undefined || exercises.data === undefined) {
    return <PageSkeleton title={`Muscles, ${year}`} />
  }
  const library = exercises.data
  const lookup = (id: ExerciseId) => library.find((one) => one.id === id)
  const grid = muscleYear(workouts.data, lookup, year, today)
  const deloads = new Set(
    workouts.data.flatMap((log) => {
      const at = log.position
      const week =
        at === undefined ? undefined : program.data?.blocks[at.blockIndex]?.weeks[at.weekIndex]
      return week?.isDeload === true ? [mondayOf(log.date)] : []
    }),
  )
  const busiest = grid.rows
    .flatMap((row) => row.sets.map((sets, at) => ({ muscle: row.muscle, sets, at })))
    .reduce<{ muscle: string; sets: number; at: number } | undefined>(
      (best, one) => (best === undefined || one.sets > best.sets ? one : best),
      undefined,
    )
  const width = grid.weeks.length * CELL
  /*
   * A label where a month's first week starts — the year's own months
   * only (the first week can begin in the December before), and none
   * crowding the one before it.
   */
  const months = grid.weeks
    .flatMap((monday, at) => {
      const day = parseDay(monday)
      const before = at === 0 ? undefined : parseDay(grid.weeks[at - 1] ?? monday)
      if (String(day.getUTCFullYear()) !== year) return []
      return before?.getUTCMonth() === day.getUTCMonth()
        ? []
        : [{ at, label: MONTHS[day.getUTCMonth()] ?? '' }]
    })
    .filter((month, index, all) => index === 0 || month.at - (all[index - 1]?.at ?? 0) >= 3)
  const previous = String(Number(year) - 1)
  const next = String(Number(year) + 1)

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-8">
      <PageHeader
        title={`Muscles, ${year}`}
        subtitle={
          busiest === undefined || busiest.sets === 0
            ? 'Nothing trained this year yet'
            : `${String(grid.rows.length)} trained · busiest ${MUSCLE_GROUP_LABELS[busiest.muscle as keyof typeof MUSCLE_GROUP_LABELS].toLowerCase()}, ${String(busiest.sets)} sets in a week`
        }
        action={
          <>
            <Link
              viewTransition
              to={`/muscles/${previous}`}
              aria-label={`Muscles in ${previous}`}
              className="text-ink-300 hover:text-accent-400 tap-target flex items-center px-2"
            >
              <ChevronLeft size={18} aria-hidden />
            </Link>
            {next <= today.slice(0, 4) ? (
              <Link
                viewTransition
                to={`/muscles/${next}`}
                aria-label={`Muscles in ${next}`}
                className="text-ink-300 hover:text-accent-400 tap-target flex items-center px-2"
              >
                <ChevronRight size={18} aria-hidden />
              </Link>
            ) : (
              <span className="text-ink-700 tap-target flex items-center px-2" aria-hidden>
                <ChevronRight size={18} />
              </span>
            )}
          </>
        }
      />

      {grid.rows.length === 0 ? (
        <Card>
          <p className="text-ink-300 text-sm">
            Nothing logged in {year}. A finished session lights its week in every muscle it worked.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-x-2 gap-y-1">
            <span aria-hidden />
            <svg viewBox={`0 0 ${String(width)} 10`} className="h-3 w-full" aria-hidden>
              {months.map((month) => (
                <text key={month.at} x={month.at * CELL} y={8} className="fill-ink-500 text-[8px]">
                  {month.label}
                </text>
              ))}
            </svg>
            {grid.rows.map((row) => (
              <Row
                key={row.muscle}
                muscle={row.muscle}
                sets={row.sets}
                total={row.total}
                weeks={grid.weeks}
                peak={grid.peak}
                deloads={deloads}
                width={width}
              />
            ))}
          </div>
          <p className="text-ink-500 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: DELOAD }} aria-hidden />
              Deload week
            </span>
            <span>Brighter is more sets; the brightest is {grid.peak} in a week.</span>
            {grid.untrained.length > 0 && (
              <span>
                Not trained:{' '}
                {grid.untrained
                  .map((muscle) => MUSCLE_GROUP_LABELS[muscle].toLowerCase())
                  .join(', ')}
                .
              </span>
            )}
          </p>
        </Card>
      )}
    </div>
  )
}

function Row({
  muscle,
  sets,
  total,
  weeks,
  peak,
  deloads,
  width,
}: {
  readonly muscle: keyof typeof MUSCLE_GROUP_LABELS
  readonly sets: readonly number[]
  readonly total: number
  readonly weeks: readonly string[]
  readonly peak: number
  readonly deloads: ReadonlySet<string>
  readonly width: number
}) {
  const label = MUSCLE_GROUP_LABELS[muscle]
  return (
    <>
      <Link
        viewTransition
        to={`/muscle/${muscle}`}
        className="text-ink-300 hover:text-accent-400 truncate text-xs"
      >
        {label}
      </Link>
      <svg
        viewBox={`0 0 ${String(width)} ${String(ROW)}`}
        preserveAspectRatio="none"
        className="h-3.5 w-full"
        role="img"
        aria-label={`${label}: ${String(total)} sets this year`}
      >
        {sets.map((count, at) => (
          <rect
            key={weeks[at]}
            x={at * CELL + 1}
            y={1}
            width={CELL - 2}
            height={ROW - 2}
            rx={2}
            fill={shade(count, peak)}
          >
            <title>
              {`Week of ${weeks[at] ?? ''}: ${String(count)} ${count === 1 ? 'set' : 'sets'}`}
            </title>
          </rect>
        ))}
        {/* A deload week is ringed in violet, over its cell rather than under it. */}
        {weeks.map((monday, at) =>
          deloads.has(monday) ? (
            <rect
              key={`d${monday}`}
              x={at * CELL + 0.75}
              y={0.75}
              width={CELL - 1.5}
              height={ROW - 1.5}
              rx={2.5}
              fill="none"
              stroke={DELOAD}
              strokeWidth={1.5}
            />
          ) : null,
        )}
      </svg>
    </>
  )
}

/** Unlit, then four steps of the accent by share of the year's peak. */
function shade(sets: number, peak: number): string {
  if (sets <= 0 || peak <= 0) return 'var(--color-ink-800)'
  const step = Math.min(4, Math.ceil((sets / peak) * 4))
  return `color-mix(in oklab, var(--color-accent-500) ${String(20 + step * 20)}%, var(--color-ink-800))`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
