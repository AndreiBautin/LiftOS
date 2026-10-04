import { Telescope } from 'lucide-react'
import type { CSSProperties } from 'react'

import { useSettings } from '@/app/context'
import { forecastLift, forecastTotal, type LiftForecast } from '@/domain/strength/forecast'
import { TOTAL_STANDARDS } from '@/domain/strength/standards'
import { strengthTrend, type TrendLift, type TrendPoint } from '@/domain/strength/trend'
import { parseDay, shiftDay } from '@/domain/time/day'
import { Card, CardHeading } from '@/components/shared/primitives'
import { LIFT_COLOURS } from '@/features/charts/palette'

import { useRecentWorkouts } from './hooks'

/** How far ahead the forecast runs, and how much history is drawn behind it. */
const WEEKS = 12
const W = 340
const H = 170
const PAD = { top: 10, right: 38, bottom: 18, left: 4 }

const LIFTS: readonly (readonly [TrendLift, string])[] = [
  ['squat', 'Squat'],
  ['bench', 'Bench'],
  ['deadlift', 'Deadlift'],
]

/**
 * Twelve weeks ahead for the three competition lifts (`forecastLift`):
 * each lift's last twelve weeks drawn as a line up to today, then **a
 * cone** opening out from it — the line carried forward with a band that
 * widens the farther it reaches, because a forecast knows less the
 * farther out it is. Under it, each lift's figure now and in twelve weeks,
 * and the total read against the published total standards.
 *
 * The fit is the Strength card's own, so this cone and that card's "at
 * this rate" date are one line. **Silent for any lift without four
 * sessions over four weeks**, and as a card when none has them.
 */
export function ForecastCard() {
  const { settings } = useSettings()
  const workouts = useRecentWorkouts(500)
  if (workouts.data === undefined) return null

  const trend = strengthTrend(workouts.data)
  const rows = LIFTS.map(([lift, name]) => ({
    lift,
    name,
    history: trend[lift],
    forecast: forecastLift(trend[lift], WEEKS),
  }))
  const shown = rows.filter(
    (row): row is typeof row & { forecast: LiftForecast } => row.forecast !== undefined,
  )
  if (shown.length === 0) return null

  const total = forecastTotal(rows.map((row) => row.forecast))
  const unit = settings.units

  /* Shared axes: twelve weeks back from the latest session to twelve ahead. */
  const anchor =
    shown
      .map((row) => row.forecast.from.date)
      .toSorted()
      .at(-1) ?? ''
  const start = shiftDay(anchor, -WEEKS * 7)
  const end = shiftDay(anchor, WEEKS * 7)
  const span = days(start, end)
  const recent = (points: readonly TrendPoint[]) => points.filter((point) => point.date >= start)
  const values = shown.flatMap((row) => [
    ...recent(row.history).map((point) => point.value),
    ...row.forecast.ahead.flatMap((point) => [point.low, point.high]),
  ])
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const x = (date: string) => PAD.left + (days(start, date) / span) * (W - PAD.left - PAD.right)
  const y = (value: number) =>
    PAD.top + (1 - (value - lo) / Math.max(hi - lo, 1)) * (H - PAD.top - PAD.bottom)
  const nowX = x(anchor)
  /* End labels pushed apart where two lifts finish close together. */
  const labelY = new Map<TrendLift, number>()
  shown
    .map((row) => ({ lift: row.lift, at: y(row.forecast.ahead.at(-1)?.mid ?? 0) + 3 }))
    .toSorted((a, b) => a.at - b.at)
    .reduce((previous, label) => {
      const at = Math.max(label.at, previous + 11)
      labelY.set(label.lift, at)
      return at
    }, Number.NEGATIVE_INFINITY)

  /* The total against the published standards, when bodyweight is known. */
  const last = total?.at(-1)
  const bodyweight = settings.bodyweight
  const standard =
    last === undefined || bodyweight === undefined || bodyweight <= 0
      ? undefined
      : TOTAL_STANDARDS.find(
          (multiple) =>
            multiple * bodyweight > shown.reduce((sum, row) => sum + row.forecast.from.mid, 0),
        )
  const standardLoad =
    standard === undefined || bodyweight === undefined
      ? undefined
      : Math.ceil((standard * bodyweight) / 5) * 5

  return (
    <Card>
      <CardHeading icon={<Telescope size={16} aria-hidden />} title="Twelve weeks out" />
      <svg
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        className="w-full"
        role="img"
        aria-label={shown
          .map(
            (row) =>
              `${row.name}: about ${String(Math.round(row.forecast.ahead.at(-1)?.mid ?? 0))} ${unit} in twelve weeks`,
          )
          .join('; ')}
      >
        <line
          x1={nowX}
          x2={nowX}
          y1={PAD.top - 4}
          y2={H - PAD.bottom}
          stroke="currentColor"
          className="text-ink-700"
          strokeDasharray="2 3"
        />
        <text
          x={nowX}
          y={H - 4}
          textAnchor="middle"
          className="fill-ink-500 text-[9px] font-medium"
        >
          Today
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-ink-600 text-[9px]">
          +12 wk
        </text>
        {shown.map((row, at) => {
          const colour = LIFT_COLOURS[row.lift]
          const cone = [row.forecast.from, ...row.forecast.ahead]
          const band = [
            ...cone.map((point) => `${x(point.date).toFixed(1)},${y(point.high).toFixed(1)}`),
            ...cone
              .toReversed()
              .map((point) => `${x(point.date).toFixed(1)},${y(point.low).toFixed(1)}`),
          ].join(' ')
          const past = recent(row.history)
          const tip = row.forecast.ahead.at(-1)
          const delay = { '--line-delay': `${String(at * 150)}ms` } as CSSProperties
          return (
            <g key={row.lift} style={delay}>
              <polygon points={band} fill={colour} opacity={0.16} className="area-fade" />
              {past.length > 1 && (
                <polyline
                  points={past
                    .map((point) => `${x(point.date).toFixed(1)},${y(point.value).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke={colour}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength={1}
                  className="line-draw"
                />
              )}
              <polyline
                points={cone
                  .map((point) => `${x(point.date).toFixed(1)},${y(point.mid).toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke={colour}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="area-fade"
              />
              {tip !== undefined && (
                <text
                  x={W - PAD.right + 4}
                  y={labelY.get(row.lift) ?? y(tip.mid) + 3}
                  className="area-fade text-[10px] font-semibold"
                  fill={colour}
                >
                  {Math.round(tip.mid)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <ul className="mt-3 space-y-1.5">
        {shown.map((row) => {
          const tip = row.forecast.ahead.at(-1)
          return (
            <li key={row.lift} className="flex items-baseline gap-2 text-sm">
              <span
                className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                style={{ background: LIFT_COLOURS[row.lift] }}
                aria-hidden
              />
              <span className="text-ink-100 w-16 shrink-0">{row.name}</span>
              <span className="numeric text-ink-300">
                {Math.round(row.forecast.from.mid)} → ~{Math.round(tip?.mid ?? 0)}
              </span>
              <span className="numeric text-ink-500 ml-auto text-xs">
                {Math.round(tip?.low ?? 0)}–{Math.round(tip?.high ?? 0)} {unit}
              </span>
            </li>
          )
        })}
      </ul>
      {last !== undefined && (
        <p className="border-ink-800 text-ink-300 mt-3 border-t pt-3 text-sm">
          Total{' '}
          <span className="numeric text-ink-50 font-semibold">
            ~{Math.round(last.mid).toLocaleString()}
          </span>{' '}
          <span className="text-ink-500 text-xs">
            ({Math.round(last.low).toLocaleString()}–{Math.round(last.high).toLocaleString()} {unit}
            )
          </span>
          {standard !== undefined && standardLoad !== undefined && (
            <span className="text-ink-500 block text-xs">
              {last.mid >= standardLoad
                ? `On course for ${String(standard)}× bodyweight (${standardLoad.toLocaleString()} ${unit}).`
                : last.high >= standardLoad
                  ? `${String(standard)}× bodyweight (${standardLoad.toLocaleString()} ${unit}) is inside the band.`
                  : `${String(standard)}× bodyweight (${standardLoad.toLocaleString()} ${unit}) is beyond the band.`}
            </span>
          )}
        </p>
      )}
      <p className="text-ink-600 mt-2 text-xs">
        A straight line through the last twelve weeks. Strength rarely climbs straight for long —
        read the band, not the line.
      </p>
    </Card>
  )
}

function days(from: string, to: string): number {
  return (parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000
}
