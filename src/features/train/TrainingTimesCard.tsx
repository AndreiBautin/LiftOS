import { Clock3 } from 'lucide-react'

import { Card, CardHeading } from '@/components/shared/primitives'
import { DAY_PARTS, trainingTimes } from '@/domain/logging/training-times'
import { WEEKDAY_NAMES } from '@/domain/time/day'

import { useRecentWorkouts } from './hooks'

const PHRASES: Readonly<Record<(typeof DAY_PARTS)[number]['key'], string>> = {
  early: 'early in the morning',
  morning: 'in the morning',
  midday: 'around midday',
  afternoon: 'in the afternoon',
  evening: 'in the evening',
  night: 'at night',
}

/** Monday first, the week every other screen uses. */
const ROWS = [1, 2, 3, 4, 5, 6, 0] as const

/**
 * When you train (`trainingTimes`): a dot for each weekday and part of
 * the day, as large as the sessions started there, and under it a gold
 * tick per part for the records set in it.
 *
 * **A matrix of dots, not the training grid's squares**: that one is a
 * calendar of days, this is a week folded onto itself — the shape of a
 * routine rather than a history. The records row is counts beside counts
 * on purpose; it describes where the good days happened and does not
 * divide them into a rate that would read as advice.
 */
export function TrainingTimesCard() {
  const workouts = useRecentWorkouts(500)
  if (workouts.data === undefined) return null
  const times = trainingTimes(workouts.data)
  if (times.sessions === 0) return null

  const most = Math.max(1, ...times.grid.flat())
  const mostRecords = Math.max(1, ...Object.values(times.records))
  const busiest = busiestCell(times.grid)
  const recordTotal = Object.values(times.records).reduce((sum, count) => sum + count, 0)
  const topPart = DAY_PARTS.toSorted((a, b) => times.records[b.key] - times.records[a.key])[0]

  return (
    <Card>
      <CardHeading icon={<Clock3 size={16} aria-hidden />} title="When you train" />
      <p className="text-ink-300 text-sm">
        {busiest === undefined ? null : (
          <>
            Most often{' '}
            <span className="text-ink-50 font-semibold">
              {WEEKDAY_NAMES[ROWS[busiest.row] ?? 1]}{' '}
              {PHRASES[DAY_PARTS[busiest.part]?.key ?? 'evening']}
            </span>
          </>
        )}
      </p>

      <svg viewBox="0 0 300 196" className="mt-3 w-full" role="img">
        <title>
          {`${String(times.sessions)} sessions by weekday and part of day; records by part of day: ${DAY_PARTS.map((part) => `${part.label} ${String(times.records[part.key])}`).join(', ')}`}
        </title>
        {DAY_PARTS.map((part, column) => (
          <text
            key={part.key}
            x={52 + column * 42}
            y={10}
            textAnchor="middle"
            className="fill-ink-500 text-[8px]"
          >
            {part.label}
          </text>
        ))}
        {ROWS.map((weekday, row) => (
          <g key={weekday}>
            <text x={0} y={30 + row * 20} className="fill-ink-500 text-[8.5px]">
              {WEEKDAY_NAMES[weekday].slice(0, 3)}
            </text>
            {DAY_PARTS.map((part, column) => {
              const count = times.grid[row]?.[column] ?? 0
              return (
                <circle
                  key={part.key}
                  cx={52 + column * 42}
                  cy={27 + row * 20}
                  r={count === 0 ? 1.5 : 2.5 + (count / most) * 6}
                  className={count === 0 ? 'fill-ink-800' : 'fill-accent-400'}
                  fillOpacity={count === 0 ? 1 : 0.35 + (count / most) * 0.65}
                />
              )
            })}
          </g>
        ))}
        <text x={0} y={183} className="text-[8.5px]" fill="oklch(0.86 0.13 85)">
          ★
        </text>
        {DAY_PARTS.map((part, column) => {
          const count = times.records[part.key]
          const height = (count / mostRecords) * 22
          return (
            <g key={part.key}>
              <rect
                x={52 + column * 42 - 7}
                y={186 - height}
                width={14}
                height={Math.max(count === 0 ? 0 : 2, height)}
                rx={3}
                fill="oklch(0.86 0.13 85)"
                fillOpacity={0.85}
              />
              {count > 0 && (
                <text
                  x={52 + column * 42}
                  y={186 - height - 3}
                  textAnchor="middle"
                  className="text-[8px]"
                  fill="oklch(0.86 0.13 85)"
                >
                  {count}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {recordTotal > 0 && topPart !== undefined && (
        <p className="text-ink-500 mt-2 text-xs">
          {times.records[topPart.key]} of {recordTotal} records came {PHRASES[topPart.key]}
          {/* Said only when true: the records' part is also the sessions' busiest. */}
          {sessionsIn(times.grid, DAY_PARTS.indexOf(topPart)) === mostSessionsInAPart(times.grid)
            ? ' — where most sessions are, too.'
            : '.'}
        </p>
      )}
    </Card>
  )
}

function busiestCell(
  grid: readonly (readonly number[])[],
): { readonly row: number; readonly part: number } | undefined {
  let best: { row: number; part: number; count: number } | undefined
  grid.forEach((cells, row) => {
    cells.forEach((count, part) => {
      if (count > 0 && (best === undefined || count > best.count)) best = { row, part, count }
    })
  })
  return best
}

function sessionsIn(grid: readonly (readonly number[])[], part: number): number {
  return grid.reduce((sum, row) => sum + (row[part] ?? 0), 0)
}

function mostSessionsInAPart(grid: readonly (readonly number[])[]): number {
  return Math.max(...DAY_PARTS.map((_, part) => sessionsIn(grid, part)))
}
