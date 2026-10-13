import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BottomSheet } from '@/components/shared/BottomSheet'
import { useSettings } from '@/app/context'
import type { ExerciseId } from '@/domain/ids/ids'
import type { ExerciseSeries } from '@/domain/logging/exercise-history'
import type { Performance } from '@/domain/logging/versus-last'
import { DAY_VERSIONS } from '@/domain/splits/rp-splits'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'

import { useExerciseHistory } from './hooks'

/** Sessions drawn in the peek: enough to see a direction, few enough to read. */
const SHOWN = 6

/**
 * An exercise's recent past, without leaving the session: held (or
 * tapped) on its name in the player, a sheet rises with the last six top
 * sets drawn as a line, the best set, and the lifter's cue — then closes
 * back onto the set being worked.
 *
 * **Its picture is a sparkline with every point labelled**: six sessions
 * is few enough that the numbers matter more than the slope, so the line
 * says which way and each point says how much. The full history is the
 * exercise page, one link away — but that page leaves the session, which
 * is the thing this exists to avoid between sets.
 */
export function ExercisePeek({
  exerciseId,
  name,
  variant,
  bodyweight,
  currentWorkoutId,
  onClose,
}: {
  readonly exerciseId: ExerciseId
  readonly name: string
  readonly variant: string | undefined
  readonly bodyweight: boolean
  /** The open session, which is not history yet and is left out. */
  readonly currentWorkoutId: string
  readonly onClose: () => void
}) {
  const { settings } = useSettings()
  const history = useExerciseHistory(exerciseId)

  const series = pickSeries(history.data ?? [], variant)
  const sessions = (series?.sessions ?? [])
    .filter((session) => session.workoutId !== currentWorkoutId)
    .slice(-SHOWN)
  const cue = settings.exerciseCues?.[exerciseId]

  return (
    <BottomSheet
      label={`${name}, recent sessions`}
      eyebrow={`Last ${sessions.length === 1 ? 'session' : `${String(sessions.length)} sessions`}${variant !== undefined && DAY_VERSIONS.includes(variant) ? ` · ${variant}` : ''}`}
      title={name}
      onClose={onClose}
    >
      {history.data === undefined ? (
        <p className="text-ink-500 mt-4 text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-ink-300 mt-4 text-sm">
          Not done before — this session is the first line in its history.
        </p>
      ) : (
        <Sparkline
          points={sessions.map((session) => ({ date: session.date, top: session.top }))}
          bodyweight={bodyweight}
          units={settings.units}
        />
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {series !== undefined && (
          <div className="bg-ink-850 rounded-xl px-3 py-2">
            <dt className="text-ink-500 text-[0.65rem] tracking-wide uppercase">Best set</dt>
            <dd className="numeric text-[oklch(0.86_0.13_85)] mt-0.5 font-semibold">
              {describe(series.best, bodyweight, settings.units)}
            </dd>
          </div>
        )}
        {cue !== undefined && (
          <div className="bg-ink-850 rounded-xl px-3 py-2">
            <dt className="text-ink-500 text-[0.65rem] tracking-wide uppercase">Your cue</dt>
            <dd className="text-accent-400 mt-0.5 text-sm italic">{cue}</dd>
          </div>
        )}
      </dl>

      <Link
        viewTransition
        to={`/exercise/${exerciseId}`}
        className="text-accent-400 tap-target mt-2 flex items-center gap-1.5 text-sm font-medium"
      >
        The whole history <ArrowRight size={14} aria-hidden />
      </Link>
    </BottomSheet>
  )
}

function Sparkline({
  points,
  bodyweight,
  units,
}: {
  readonly points: readonly { readonly date: string; readonly top: Performance }[]
  readonly bodyweight: boolean
  readonly units: WeightUnit
}) {
  const value = (top: Performance) =>
    bodyweight && (top.load ?? 0) === 0 ? (top.reps ?? 0) : (top.load ?? 0)
  const values = points.map((point) => value(point.top))
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = Math.max(1, high - low)
  const width = 300
  const x = (at: number) =>
    points.length === 1 ? width / 2 : 18 + (at / (points.length - 1)) * (width - 36)
  const y = (v: number) => 62 - ((v - low) / span) * 40
  const path = values
    .map((v, at) => `${at === 0 ? 'M' : 'L'} ${String(x(at))} ${String(y(v))}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${String(width)} 96`} className="mt-3 w-full" role="img">
      <title>
        {points
          .map((point) => `${point.date}: ${describe(point.top, bodyweight, units)}`)
          .join('; ')}
      </title>
      <defs>
        <linearGradient id="peek-under" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-accent-500)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-accent-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${String(x(values.length - 1))} 80 L ${String(x(0))} 80 Z`}
        className="area-fade"
        fill="url(#peek-under)"
      />
      <path
        d={path}
        className="stroke-accent-400 line-draw fill-none"
        strokeWidth="2"
        strokeLinejoin="round"
        pathLength={1}
      />
      {points.map((point, at) => {
        const v = values[at] ?? 0
        const latest = at === points.length - 1
        return (
          <g key={point.date + String(at)}>
            <circle
              cx={x(at)}
              cy={y(v)}
              r={latest ? 4.5 : 3}
              className={latest ? 'fill-accent-400' : 'fill-ink-300'}
            />
            <text
              x={x(at)}
              y={y(v) - 9}
              textAnchor="middle"
              className={
                latest ? 'fill-ink-50 text-[10px] font-semibold' : 'fill-ink-300 text-[9px]'
              }
            >
              {short(point.top, bodyweight)}
            </text>
            <text x={x(at)} y={93} textAnchor="middle" className="fill-ink-500 text-[8px]">
              {new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function pickSeries(
  all: readonly ExerciseSeries[],
  variant: string | undefined,
): ExerciseSeries | undefined {
  const version = variant !== undefined && DAY_VERSIONS.includes(variant) ? variant : undefined
  return all.find((one) => one.variant === version) ?? all[0]
}

function short(top: Performance, bodyweight: boolean): string {
  if (bodyweight && (top.load ?? 0) === 0) return `×${String(top.reps ?? '—')}`
  return `${String(top.load ?? '—')}×${String(top.reps ?? '—')}`
}

function describe(top: Performance, bodyweight: boolean, units: WeightUnit): string {
  const load =
    bodyweight && (top.load ?? 0) === 0
      ? 'Bodyweight'
      : top.load === undefined
        ? '—'
        : formatLoad(top.load, units)
  return `${load} × ${String(top.reps ?? '—')}`
}
