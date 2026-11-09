import { useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { Module } from '@/components/shared/Module'
import { STRENGTH_LIFT_SLUGS } from '@/domain/exercises/catalogue'
import { thenAndNow } from '@/domain/logging/then-now'
import { forecastLift, forecastTotal, type LiftForecast } from '@/domain/strength/forecast'
import { projectReach } from '@/domain/strength/projection'
import { strengthStandings, type LiftStanding } from '@/domain/strength/standards'
import {
  measuredMaxes,
  strengthTrend,
  type TrendLift,
  type TrendPoint,
} from '@/domain/strength/trend'
import { parseDay, shiftDay, toDayKey } from '@/domain/time/day'
import { formatLoad } from '@/domain/units/weight'
import { LIFT_COLOURS } from '@/features/charts/palette'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format-date'

import { isDeloadSession, useProgram, useRecentWorkouts } from './hooks'
import { LiftGoal } from './LiftGoal'

const LIFTS: readonly {
  readonly lift: TrendLift
  readonly label: string
  /** The name `strengthStandings` gives it. */
  readonly standing: string
}[] = [
  { lift: 'squat', label: 'Squat', standing: 'Squat' },
  { lift: 'bench', label: 'Bench', standing: 'Bench press' },
  { lift: 'deadlift', label: 'Deadlift', standing: 'Deadlift' },
]

/** How far ahead the cone runs. */
const WEEKS = 12

/**
 * One lift at a time: where it has been, where it is heading, and what it is
 * measured against. **This was five cards** — the standards, the trend, the
 * forecast, the goals and then-and-now — and all five were asking about the
 * same three lines. Each lift's line now runs straight on into its cone, with
 * the standard, the goal and the first month's top set read off beneath.
 *
 * **The total and the standards read what the sessions measure** (each lift's
 * latest finished session, deloads skipped), with the stored max standing in
 * only for a lift no session has measured. The fit behind the cone is the one
 * behind the "at this rate" date, so the two cannot disagree. Thin evidence
 * silences the cone rather than drawing a guess.
 */
export function StrengthModule() {
  const { settings } = useSettings()
  const program = useProgram()
  const today = toDayKey(useServices().clock.now())
  const workouts = useRecentWorkouts(2000)
  const [chosen, setChosen] = useState<TrendLift>('squat')

  const logs = workouts.data ?? []
  const trend = strengthTrend(logs)
  const measured = measuredMaxes(logs, (log) => isDeloadSession(log, program.data))
  const { lifts, total } = strengthStandings({
    estimatedMaxes: { ...settings.estimatedMaxes, ...measured },
    ...(settings.bodyweight !== undefined ? { bodyweight: settings.bodyweight } : {}),
  })
  const standingOf = (name: string): LiftStanding | undefined =>
    lifts.find((one) => one.name === name)

  const entry = LIFTS.find((one) => one.lift === chosen) ?? LIFTS[0]
  if (entry === undefined) return null
  const standing = standingOf(entry.standing)
  const points = trend[chosen]
  const forecast = forecastLift(points, WEEKS)
  const reach =
    standing?.next === undefined ? undefined : projectReach(points, standing.next.load, today)
  const span = thenAndNow(logs, today).find(
    (row) => String(row.exerciseId) === STRENGTH_LIFT_SLUGS[chosen],
  )
  const totalAhead = forecastTotal(LIFTS.map(({ lift }) => forecastLift(trend[lift], WEEKS)))?.at(
    -1,
  )
  const units = settings.units

  return (
    <Module
      title="Strength"
      figure={total.max === undefined ? undefined : Math.round(total.max).toLocaleString()}
      unit={
        total.max === undefined
          ? undefined
          : `lb total${total.multiple === undefined ? '' : ` · ${total.multiple.toFixed(2)}×`}`
      }
      action={
        <Link viewTransition to="/records" className="text-accent-400 tap-target flex items-center">
          Records
        </Link>
      }
    >
      <div
        role="group"
        aria-label="Lift"
        className="bg-ink-900 mt-3 grid grid-cols-3 gap-1 rounded-[0.875rem] p-1"
      >
        {LIFTS.map(({ lift, label, standing: name }) => {
          const max = standingOf(name)?.max
          return (
            <button
              key={lift}
              type="button"
              aria-pressed={chosen === lift}
              onClick={() => {
                setChosen(lift)
              }}
              className={cn(
                'numeric h-11 truncate rounded-[0.6875rem] px-1 text-sm',
                chosen === lift ? 'bg-ink-800 text-ink-50 font-semibold' : 'text-ink-500',
              )}
            >
              {label}
              {max === undefined ? '' : ` ${String(Math.round(max))}`}
            </button>
          )
        })}
      </div>

      {points.length >= 2 ? (
        <LiftChart key={chosen} lift={chosen} points={points} forecast={forecast} unit={units} />
      ) : (
        <p className="text-ink-500 mt-3 text-sm">
          {entry.label} draws here from its second session: its estimated max over time, then where
          the line is heading.
        </p>
      )}

      <dl className="numeric mt-2 text-sm">
        {span !== undefined && (
          <Fact term={`Since ${monthOf(span.then.from)}`}>
            {topSet(span.then.top.load, span.then.top.reps, units)} →{' '}
            {topSet(span.now.top.load, span.now.top.reps, units)}
          </Fact>
        )}
        {standing?.multiple !== undefined && (
          <Fact term="Next standard">
            {standing.next === undefined ? (
              'Top standard reached'
            ) : (
              <>
                {standing.next.multiple}× · {standing.next.load} lb
                {reach === undefined ? '' : ` · ${whenOf(reach, today)}`}
              </>
            )}
          </Fact>
        )}
        {totalAhead !== undefined && (
          <Fact term="Total in 12 weeks">
            ~{Math.round(totalAhead.mid).toLocaleString()} {units}
          </Fact>
        )}
      </dl>
      <LiftGoal lift={chosen} name={entry.standing} colour={LIFT_COLOURS[chosen]} />
      {settings.bodyweight === undefined && (
        <p className="text-ink-500 mt-2 text-sm">
          Set your bodyweight in Settings: the standards are multiples of it.
        </p>
      )}
    </Module>
  )
}

function Fact({ term, children }: { readonly term: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-baseline justify-between gap-3">
      <dt className="text-ink-500 shrink-0">{term}</dt>
      <dd className="text-ink-100 min-w-0 truncate text-right">{children}</dd>
    </div>
  )
}

/**
 * The lift's estimated max as a line, carried on into a cone that widens with
 * distance, because a forecast knows less the farther out it is.
 *
 * Scaled to the data, not anchored at zero: from zero a forty-pound climb is a
 * flat line near the top of the box. It scrubs: hover or drag and the line
 * under it reads that day. `touch-pan-y`, so a vertical swipe still scrolls.
 */
function LiftChart({
  lift,
  points,
  forecast,
  unit,
}: {
  readonly lift: TrendLift
  readonly points: readonly TrendPoint[]
  readonly forecast: LiftForecast | undefined
  readonly unit: string
}) {
  const [at, setAt] = useState<TrendPoint | undefined>(undefined)
  const W = 350
  const H = 176
  const PAD = { top: 22, right: 2, bottom: 20, left: 2 }

  const anchor = points.at(-1)?.date ?? ''
  const first = points[0]?.date ?? anchor
  const end = forecast === undefined ? anchor : shiftDay(anchor, WEEKS * 7)
  const span = Math.max(1, days(first, end))
  const values = [
    ...points.map((point) => point.value),
    ...(forecast?.ahead.flatMap((point) => [point.low, point.high]) ?? []),
  ]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const x = (date: string) => PAD.left + (days(first, date) / span) * (W - PAD.left - PAD.right)
  const y = (value: number) =>
    PAD.top + (1 - (value - lo) / Math.max(hi - lo, 1)) * (H - PAD.top - PAD.bottom)
  const colour = LIFT_COLOURS[lift]
  const line = points.map((point) => `${x(point.date).toFixed(1)},${y(point.value).toFixed(1)}`)
  const tip = forecast?.ahead.at(-1)
  const cone = forecast === undefined ? undefined : [forecast.from, ...forecast.ahead]
  const shownPoint = at ?? points.at(-1)

  const scrub = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const viewX = ((event.clientX - box.left) / box.width) * W
    const nearest = points.reduce<TrendPoint | undefined>(
      (best, point) =>
        best === undefined || Math.abs(x(point.date) - viewX) < Math.abs(x(best.date) - viewX)
          ? point
          : best,
      undefined,
    )
    setAt(nearest)
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        className="mt-3 w-full touch-pan-y"
        role="img"
        aria-label={`Estimated max since ${dayOf(first)}, now ${String(Math.round(points.at(-1)?.value ?? 0))} ${unit}${tip === undefined ? '' : `, about ${String(Math.round(tip.mid))} in twelve weeks`}`}
        onPointerMove={scrub}
        onPointerDown={scrub}
        onPointerLeave={() => {
          setAt(undefined)
        }}
      >
        <line
          x1={x(anchor)}
          x2={x(anchor)}
          y1={PAD.top - 12}
          y2={H - PAD.bottom}
          stroke="var(--color-ink-700)"
          strokeDasharray="2 4"
        />
        {cone !== undefined && (
          <>
            <polygon
              className="area-fade"
              fill={colour}
              opacity={0.16}
              points={[
                ...cone.map((one) => `${x(one.date).toFixed(1)},${y(one.high).toFixed(1)}`),
                ...cone
                  .toReversed()
                  .map((one) => `${x(one.date).toFixed(1)},${y(one.low).toFixed(1)}`),
              ].join(' ')}
            />
            <polyline
              className="area-fade"
              fill="none"
              stroke={colour}
              strokeWidth="2"
              strokeDasharray="5 5"
              points={cone
                .map((one) => `${x(one.date).toFixed(1)},${y(one.mid).toFixed(1)}`)
                .join(' ')}
            />
          </>
        )}
        <polyline
          className="line-draw"
          pathLength={1}
          fill="none"
          stroke={colour}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={line.join(' ')}
        />
        {shownPoint !== undefined && (
          <circle
            cx={x(shownPoint.date)}
            cy={y(shownPoint.value)}
            r="5"
            fill="var(--color-ink-950)"
            stroke={colour}
            strokeWidth="2.5"
          />
        )}
        {tip !== undefined && (
          <text
            x={W - PAD.right}
            y={Math.max(14, y(tip.high) - 6)}
            textAnchor="end"
            className="font-display fill-ink-50 text-base font-semibold"
          >
            ~{Math.round(tip.mid)}
          </text>
        )}
        <text x={PAD.left} y={H - 4} className="fill-ink-500 text-xs">
          {dayOf(first)}
        </text>
        {forecast !== undefined && (
          <>
            <text x={x(anchor)} y={H - 4} textAnchor="middle" className="fill-ink-500 text-xs">
              Today
            </text>
            <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-ink-500 text-xs">
              +12 wk
            </text>
          </>
        )}
      </svg>
      <p className="numeric text-ink-500 mt-1 min-h-5 text-sm" role="status">
        {at === undefined ? (
          tip === undefined ? (
            'Too few sessions lately to say where this is heading.'
          ) : (
            <>
              Band in 12 weeks: {Math.round(tip.low)}–{Math.round(tip.high)} {unit}
            </>
          )
        ) : (
          <>
            {dayOf(at.date)}:{' '}
            <span className="text-ink-50">
              {Math.round(at.value)} {unit}
            </span>
          </>
        )}
      </p>
    </>
  )
}

function days(from: string, to: string): number {
  return (parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000
}

function dayOf(date: string): string {
  return formatDate(parseDay(date), { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function monthOf(date: string): string {
  return formatDate(parseDay(date), { month: 'long', timeZone: 'UTC' })
}

/** "December", or "March 2027" once it is another year. */
function whenOf(day: string, today: string): string {
  return formatDate(parseDay(day), {
    month: 'short',
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  })
}

function topSet(load: number | undefined, reps: number | undefined, units: 'lb' | 'kg'): string {
  const figure =
    load === undefined || load <= 0 ? 'BW' : formatLoad(load, units).replace(` ${units}`, '')
  return `${figure} × ${String(reps ?? '—')}`
}
