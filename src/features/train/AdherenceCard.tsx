import { CalendarCheck } from 'lucide-react'

import { useServices, useSettings } from '@/app/context'
import { blockWindow } from '@/domain/logging/block'
import { adherence, type AdherenceDay } from '@/domain/programs/adherence'
import { mondayOf, parseDay, shiftDay, toDayKey, WEEKDAY_LABELS } from '@/domain/time/day'
import { Card, CardHeading } from '@/components/shared/primitives'
import { cn } from '@/lib/cn'

import { useProgram, useRecentWorkouts, useSchedule } from './hooks'

/** Missed days named under the card; the rest are counted. */
const NAMED = 3

/**
 * How the block has followed the plan (`adherence`), drawn as a **punch
 * card**: a row a week, a hole a scheduled day — punched through where the
 * session was done, torn where its day went by, ringed for today and faint
 * for what is still ahead — and the deload row tinted violet. Above it,
 * full weeks in a row; below, the missed days by name.
 *
 * A miss is amber ink, never red: a week off is often the right call, and
 * the card reports it rather than scolding. Silent until something has
 * been filed.
 */
export function AdherenceCard() {
  const today = toDayKey(useServices().clock.now())
  const { settings } = useSettings()
  const program = useProgram()
  const schedule = useSchedule()
  const workouts = useRecentWorkouts(1000)

  if (program.data === undefined || schedule.data === undefined || workouts.data === undefined) {
    return null
  }
  const filed = workouts.data
    .filter((log) => log.status === 'completed')
    .map((log) => ({ date: log.date, title: log.title }))
  if (filed.length === 0) return null

  const weeks = program.data.blocks.flatMap((block) => block.weeks).length
  const window = blockWindow(schedule.data.blockStartedOn, weeks, today)
  const result = adherence(
    program.data,
    schedule.data.blockStartedOn,
    filed,
    today,
    window,
    settings.dayMoves,
  )
  const columns = Math.max(...result.weeks.map((week) => week.planned), 1)
  /* Weeks past the next are all still ahead: one line, not a stack of empty rows. */
  const nowAt = result.weeks.findIndex((week) => week.monday === mondayOf(today))
  const shown = nowAt === -1 ? result.weeks : result.weeks.slice(0, nowAt + 2)
  const later = result.weeks.slice(shown.length)
  const deloadIn = later.findIndex((week) => week.isDeload)

  return (
    <Card>
      <CardHeading icon={<CalendarCheck size={16} aria-hidden />} title="Showing up" />
      <p className="mb-3 flex items-baseline gap-2">
        <span className="numeric text-ink-50 text-3xl font-semibold">{result.fullWeeks}</span>
        <span className="text-ink-300 text-sm">
          full {result.fullWeeks === 1 ? 'week' : 'weeks'} in a row
          {result.due > 0 && (
            <span className="text-ink-500">
              {' '}
              · {result.done} of {result.due} this block
            </span>
          )}
        </span>
      </p>
      <ol className="space-y-1.5" aria-label="This block, week by week">
        {shown.map((week, at) => {
          const current = today >= week.monday && today <= shiftDay(week.monday, 6)
          return (
            <li
              key={week.monday}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-1.5',
                week.isDeload && 'bg-[oklch(0.62_0.13_285_/_0.12)]',
                current && 'ring-ink-700 ring-1',
              )}
            >
              <span
                className={cn(
                  'w-14 shrink-0 text-xs font-medium',
                  week.isDeload ? 'text-[oklch(0.78_0.11_285)]' : 'text-ink-500',
                )}
              >
                {week.isDeload ? 'Deload' : `Week ${String(at + 1)}`}
              </span>
              <span
                className="grid flex-1 gap-2"
                style={{ gridTemplateColumns: `repeat(${String(columns)}, 1.75rem)` }}
              >
                {week.days.map((day) => (
                  <Hole key={day.on} day={day} />
                ))}
              </span>
              <span className="numeric text-ink-300 shrink-0 text-xs">
                {week.days.some((day) => day.state !== 'ahead') ? (
                  <>
                    {week.done}/{week.planned}
                    {week.extra > 0 && <span className="text-ink-500"> +{week.extra}</span>}
                  </>
                ) : (
                  <span className="text-ink-600">—</span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      {later.length > 0 && (
        <p className="text-ink-500 mt-2 px-2 text-xs">
          Then {later.length} more {later.length === 1 ? 'week' : 'weeks'}
          {deloadIn !== -1 &&
            (deloadIn === later.length - 1
              ? ', the last a deload'
              : `, a deload in week ${String(shown.length + deloadIn + 1)}`)}
        </p>
      )}
      {result.missed.length > 0 && (
        <p className="text-ink-500 mt-3 text-xs">
          <span className="text-[oklch(0.78_0.15_85)]">Missed</span>{' '}
          {result.missed
            .slice(-NAMED)
            .map((day) => `${day.title} · ${shortDate(day.on)}`)
            .join(', ')}
          {result.missed.length > NAMED && ` and ${String(result.missed.length - NAMED)} more`}
        </p>
      )}
    </Card>
  )
}

/** One scheduled day: a hole in the card, punched, torn, ringed or faint. */
function Hole({ day }: { readonly day: AdherenceDay }) {
  const letter = WEEKDAY_LABELS[parseDay(day.on).getUTCDay()]
  return (
    <span
      title={`${day.title} · ${shortDate(day.on)} · ${day.state}`}
      className={cn(
        'relative flex size-7 items-center justify-center rounded-full text-[0.65rem] font-semibold',
        day.state === 'done' && 'bg-accent-500 text-ink-950 shadow-[0_0_10px_var(--glow-accent)]',
        day.state === 'missed' &&
          'border border-dashed border-[oklch(0.78_0.15_85_/_0.7)] text-[oklch(0.78_0.15_85)]',
        day.state === 'today' && 'border-accent-400 text-accent-400 border-2',
        day.state === 'ahead' && 'border-ink-700 text-ink-600 border',
      )}
    >
      {day.state === 'missed' ? (
        <svg viewBox="0 0 28 28" className="absolute inset-0" aria-hidden>
          <path d="M8 20 L20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <span aria-hidden>{letter}</span>
      )}
      <span className="sr-only">
        {day.title}, {shortDate(day.on)}: {day.state}
      </span>
    </span>
  )
}

function shortDate(on: string): string {
  return parseDay(on).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
