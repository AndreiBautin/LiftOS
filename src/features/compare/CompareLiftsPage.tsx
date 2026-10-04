import { useSearchParams } from 'react-router-dom'

import { asExerciseId, type ExerciseId } from '@/domain/ids/ids'
import { bestsByExercise } from '@/domain/logging/bests'
import type { ExerciseSeries } from '@/domain/logging/exercise-history'
import { relativeSeries, type RelativePoint } from '@/domain/strength/relative'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/shared/primitives'
import { useExerciseHistory, useExercises, useRecentWorkouts } from '@/features/train/hooks'

const COLOURS = ['var(--color-accent-400)', 'var(--color-cool-500)'] as const

/**
 * Two exercises on one chart (`relativeSeries`): each line read against
 * its own first session, so a curl and a squat share an axis and the
 * question it answers is which moved further, not which is heavier.
 *
 * **What is plotted is each session's estimated max where the reps allow
 * one, else its top bar** — the same reading the exercise page leads
 * with — and a bodyweight movement on the body alone climbs by reps.
 * Chosen by two pickers that list only exercises with history; the pair
 * is in the address (`?a=&b=`), so a comparison can be come back to.
 */
export function CompareLiftsPage() {
  const [params, setParams] = useSearchParams()
  const library = useExercises().data ?? []
  const workouts = useRecentWorkouts(1000)
  const trained = new Set(
    (workouts.data === undefined ? [] : bestsByExercise(workouts.data)).map(
      (one) => one.exerciseId,
    ),
  )
  const choices = library
    .filter((one) => trained.has(one.id))
    .toSorted((a, b) => a.name.localeCompare(b.name))

  const a = params.get('a') ?? choices[0]?.id ?? ''
  const b = params.get('b') ?? choices.find((one) => one.id !== a)?.id ?? ''
  const first = useExerciseHistory(asExerciseId(a))
  const second = useExerciseHistory(asExerciseId(b))
  const nameOf = (id: string) => library.find((one) => one.id === id)?.name ?? id
  const lines = [
    { id: a, points: readingsOf(first.data) },
    { id: b, points: readingsOf(second.data) },
  ]

  const pick = (key: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(params)
    next.set('a', a)
    next.set('b', b)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <PageHeader title="Compare" subtitle="Two exercises, each against where it started" />
      <div className="grid grid-cols-2 gap-2">
        {(['a', 'b'] as const).map((key, at) => (
          <label key={key} className="block">
            <span className="sr-only">{at === 0 ? 'First exercise' : 'Second exercise'}</span>
            <select
              value={key === 'a' ? a : b}
              onChange={(event) => {
                pick(key, event.target.value)
              }}
              className="bg-ink-900 text-ink-100 tap-target w-full rounded-lg border-2 px-2 text-sm"
              style={{ borderColor: COLOURS[at] }}
            >
              {choices.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <Card>
        {lines.every((line) => line.points.length < 2) ? (
          <p className="text-ink-500 text-sm">Two sessions of each are needed to draw a line.</p>
        ) : (
          <TwoLines lines={lines} nameOf={nameOf} />
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {lines.map((line, at) => {
            const last = line.points.at(-1)
            return (
              <div key={`${line.id}-${String(at)}`} className="well p-3">
                <dt className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: COLOURS[at] }}
                  />
                  <span className="text-ink-300 truncate">{nameOf(line.id)}</span>
                </dt>
                <dd className="numeric text-ink-50 mt-1 text-2xl font-semibold">
                  {last === undefined
                    ? '—'
                    : `${last.percent >= 100 ? '+' : ''}${(last.percent - 100).toFixed(1)}%`}
                </dd>
                <dd className="numeric text-ink-500 text-xs">
                  {line.points.length} sessions
                  {line.points[0] !== undefined && last !== undefined
                    ? ` · ${String(Math.round(line.points[0].value))} → ${String(Math.round(last.value))}`
                    : ''}
                </dd>
              </div>
            )
          })}
        </dl>
      </Card>
    </div>
  )
}

function readingsOf(series: readonly ExerciseSeries[] | undefined): readonly RelativePoint[] {
  const longest = (series ?? []).toSorted((x, y) => y.sessions.length - x.sessions.length)[0]
  if (longest === undefined) return []
  return relativeSeries(
    longest.sessions.map((session) => ({
      date: session.date,
      value: session.estimate ?? session.top.load ?? session.top.reps ?? 0,
    })),
  )
}

function TwoLines({
  lines,
  nameOf,
}: {
  readonly nameOf: (id: string) => string
  readonly lines: readonly {
    readonly id: ExerciseId | string
    readonly points: readonly RelativePoint[]
  }[]
}) {
  const width = 320
  const height = 170
  const all = lines.flatMap((line) => line.points)
  const dates = all.map((point) => Date.parse(point.date))
  const start = Math.min(...dates)
  const span = Math.max(1, Math.max(...dates) - start)
  const low = Math.min(100, ...all.map((point) => point.percent))
  const high = Math.max(100, ...all.map((point) => point.percent))
  const range = Math.max(1, high - low)
  const x = (date: string) => 10 + ((Date.parse(date) - start) / span) * (width - 70)
  const y = (percent: number) => 12 + (1 - (percent - low) / range) * (height - 34)

  return (
    <svg viewBox={`0 0 ${String(width)} ${String(height)}`} className="w-full" role="img">
      <title>
        {/* A sentence per line, not every point: the figures under the chart carry the rest. */}
        {lines
          .map(
            (line) =>
              `${nameOf(String(line.id))}: ${String(line.points.at(-1)?.percent ?? 100)}% of where it started, over ${String(line.points.length)} sessions`,
          )
          .join('; ')}
      </title>
      <defs>
        {lines.map((_, at) => (
          <linearGradient key={at} id={`compare-under-${String(at)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLOURS[at]} stopOpacity="0.22" />
            <stop offset="1" stopColor={COLOURS[at]} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      <line
        x1="10"
        x2={width - 60}
        y1={y(100)}
        y2={y(100)}
        className="stroke-ink-700"
        strokeDasharray="3 4"
      />
      <text x={width - 56} y={y(100) + 3} className="fill-ink-500 text-[8px]">
        start
      </text>
      {lines.map((line, at) => {
        if (line.points.length < 2) return null
        const path = line.points
          .map(
            (point, index) =>
              `${index === 0 ? 'M' : 'L'} ${String(x(point.date))} ${String(y(point.percent))}`,
          )
          .join(' ')
        const last = line.points.at(-1)
        const first = line.points[0]
        return (
          <g
            key={`${String(line.id)}-${String(at)}`}
            style={{ '--line-delay': `${String(at * 200)}ms` } as React.CSSProperties}
          >
            {first !== undefined && last !== undefined && (
              <path
                className="area-fade"
                d={`${path} L ${String(x(last.date))} ${String(height - 22)} L ${String(x(first.date))} ${String(height - 22)} Z`}
                fill={`url(#compare-under-${String(at)})`}
              />
            )}
            <path
              d={path}
              fill="none"
              stroke={COLOURS[at]}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="line-draw"
              pathLength={1}
            />
            {last !== undefined && (
              <>
                <circle
                  className="line-end"
                  cx={x(last.date)}
                  cy={y(last.percent)}
                  r="3.5"
                  fill={COLOURS[at]}
                />
                <text
                  x={x(last.date) + 6}
                  y={y(last.percent) + (at === 0 ? -4 : 10)}
                  className="text-[9px] font-semibold"
                  fill={COLOURS[at]}
                >
                  {last.percent >= 100 ? '+' : ''}
                  {(last.percent - 100).toFixed(1)}%
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
