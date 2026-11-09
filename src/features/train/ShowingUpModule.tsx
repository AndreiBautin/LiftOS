import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { useServices } from '@/app/context'
import { Module } from '@/components/shared/Module'
import { blockWindow } from '@/domain/logging/block'
import { weekRecap } from '@/domain/logging/recap'
import { DAY_PARTS, trainingTimes } from '@/domain/logging/training-times'
import { adherence } from '@/domain/programs/adherence'
import { mondayOf, parseDay, shiftDay, toDayKey, WEEKDAY_NAMES } from '@/domain/time/day'
import { formatDate } from '@/lib/format-date'

import { ActivityGrid } from './ActivityGrid'
import { useActivity, useProgram, useRecentWorkouts, useSchedule } from './hooks'

const PHRASES: Readonly<Record<(typeof DAY_PARTS)[number]['key'], string>> = {
  early: 'early in the morning',
  morning: 'in the morning',
  midday: 'around midday',
  afternoon: 'in the afternoon',
  evening: 'in the evening',
  night: 'at night',
}

/** `trainingTimes` runs Monday first, the week every other screen uses. */
const ROWS = [1, 2, 3, 4, 5, 6, 0] as const

/** Missed days named; the rest are counted. */
const NAMED = 3

/**
 * Whether the work is getting done, as a calendar of it. **This was five
 * cards**: the radar of this week, the bars of last week, the punch card, the
 * grid and the dot matrix of when. The grid carries the shape, since a lit
 * square is a session and each one opens it; the others leave their sentence:
 * last week against the one before, full weeks in a row, what was missed, and
 * when you usually train.
 *
 * Counts beside counts, never a rate: "most often Thursday" describes a habit
 * and does not read as advice. A miss is amber ink, never red, because a week
 * off is often the right call. Changes are quiet either way, because a lighter
 * week is often the plan.
 */
export function ShowingUpModule() {
  const services = useServices()
  const today = toDayKey(services.clock.now())
  const activity = useActivity()
  const program = useProgram()
  const schedule = useSchedule()
  const workouts = useRecentWorkouts(1000)
  const recap = useQuery({
    queryKey: ['workouts', 'recap', today],
    queryFn: async () => weekRecap(await services.workouts.recent(500), today) ?? null,
  })

  if (activity.data === undefined) return null
  const { weeks, sessions } = activity.data

  const filed = (workouts.data ?? [])
    .filter((log) => log.status === 'completed')
    .map((log) => ({ date: log.date, title: log.title }))
  const followed =
    program.data === undefined || schedule.data === undefined || filed.length === 0
      ? undefined
      : adherence(
          program.data,
          schedule.data.blockStartedOn,
          filed,
          today,
          blockWindow(
            schedule.data.blockStartedOn,
            program.data.blocks.flatMap((block) => block.weeks).length,
            today,
          ),
          schedule.data.moves,
        )
  const habit = busiest(workouts.data ?? [])
  const last = recap.data?.last
  const before = recap.data?.before

  return (
    <Module
      title="Showing up"
      figure={String(sessions)}
      unit={`${sessions === 1 ? 'session' : 'sessions'} in ${String(weeks.length)} weeks`}
      action={
        <>
          {last !== undefined && (
            <Link
              viewTransition
              to={`/wrapped/${shiftDay(mondayOf(today), -7)}`}
              className="text-accent-400 tap-target flex items-center justify-end"
            >
              Play last week
            </Link>
          )}
          <Link
            viewTransition
            to="/month"
            className="text-accent-400 tap-target flex items-center justify-end"
          >
            Month
          </Link>
        </>
      }
    >
      {sessions === 0 ? (
        <p className="text-ink-500 mt-3 text-sm">Every session lights a square here.</p>
      ) : (
        <div className="mt-3">
          <ActivityGrid activity={activity.data} />
        </div>
      )}

      {last !== undefined && before !== undefined && recap.data != null && (
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Figure
            value={String(last.sessions)}
            label="sessions last week"
            change={changeOf(last.sessions, before.sessions)}
          />
          <Figure
            value={String(last.sets)}
            label="sets"
            change={changeOf(last.sets, before.sets)}
          />
          <Figure
            value={String(recap.data.records)}
            label={recap.data.records === 1 ? 'record' : 'records'}
            gold={recap.data.records > 0}
          />
        </dl>
      )}

      <div className="text-ink-500 mt-3 space-y-1 text-sm">
        {followed !== undefined && followed.fullWeeks > 0 && (
          <p>
            <span className="numeric text-ink-100">{followed.fullWeeks}</span> full{' '}
            {followed.fullWeeks === 1 ? 'week' : 'weeks'} in a row
            {followed.due > 0 && (
              <>
                {' '}
                · {followed.done} of {followed.due} this block
              </>
            )}
          </p>
        )}
        {followed !== undefined && followed.missed.length > 0 && (
          <p>
            <span className="text-warn-500">Missed</span>{' '}
            {followed.missed
              .slice(-NAMED)
              .map((day) => `${day.title} · ${shortDate(day.on)}`)
              .join(', ')}
            {followed.missed.length > NAMED &&
              ` and ${String(followed.missed.length - NAMED)} more`}
          </p>
        )}
        {habit !== undefined && <p>Most often {habit}.</p>}
      </div>
    </Module>
  )
}

function Figure({
  value,
  label,
  change,
  gold = false,
}: {
  readonly value: string
  readonly label: string
  readonly change?: string | undefined
  readonly gold?: boolean
}) {
  return (
    <div className="min-w-0">
      <dd className={`font-display text-2xl font-semibold ${gold ? 'text-gold-400' : ''}`}>
        {value}
      </dd>
      <dt className="text-ink-500 text-[0.8125rem] leading-snug">
        {label}
        {change !== undefined && `, ${change}`}
      </dt>
    </div>
  )
}

function changeOf(now: number, then: number): string | undefined {
  const delta = now - then
  if (then === 0 || delta === 0) return undefined
  return `${delta > 0 ? 'up' : 'down'} ${String(Math.abs(delta))}`
}

function shortDate(on: string): string {
  return formatDate(parseDay(on), { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "Thursday, early in the morning": the weekday and part of day most started in. */
function busiest(workouts: Parameters<typeof trainingTimes>[0]): string | undefined {
  const times = trainingTimes(workouts)
  if (times.sessions === 0) return undefined
  const cells = times.grid.flatMap((parts, row) =>
    parts.map((count, part) => ({ row, part, count })),
  )
  const found = cells.reduce<(typeof cells)[number] | undefined>(
    (best, cell) => (cell.count > (best?.count ?? 0) ? cell : best),
    undefined,
  )
  if (found === undefined) return undefined
  return `${WEEKDAY_NAMES[ROWS[found.row] ?? 1]}, ${PHRASES[DAY_PARTS[found.part]?.key ?? 'evening']}`
}
