import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useServices } from '@/app/context'
import { yearInSquares } from '@/domain/logging/year'
import { shiftDay, toDayKey } from '@/domain/time/day'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Card } from '@/components/shared/primitives'
import { useRecentWorkouts } from '@/features/train/hooks'
import { SharePicture } from '@/features/share/ShareSession'
import { drawYearCard } from '@/features/share/year-card'
import { cn } from '@/lib/cn'

/** The training grid's own bands, so a lit square means the same on both. */
const BANDS = [1, 10, 20, 30] as const

/**
 * A year as twelve small calendars (`yearInSquares`): a square a day,
 * lit by its working sets in the training grid's bands, today ringed and
 * the days to come left faint — with the year's weeks trained and its
 * best and current week streaks above.
 *
 * **Twelve calendars, not one long strip.** The grid on Today is the last
 * eighteen weeks as a ribbon; a year read that way is too long to take in,
 * where twelve months laid out as months are read the way a wall planner
 * is. Each month's name opens its month page.
 */
export function YearPage() {
  const today = toDayKey(useServices().clock.now())
  const { year = today.slice(0, 4) } = useParams()
  const workouts = useRecentWorkouts(2000)

  if (workouts.data === undefined) return <PageSkeleton title={year} />
  const squares = yearInSquares(workouts.data, year, today)
  const previous = String(Number(year) - 1)
  const next = String(Number(year) + 1)

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-8">
      <PageHeader
        title={year}
        subtitle={`${String(squares.sessions)} sessions · ${String(squares.daysTrained)} days trained`}
        action={
          <>
            {squares.sessions > 0 && (
              <SharePicture
                draw={() =>
                  drawYearCard({
                    year,
                    days: squares.days,
                    today,
                    sessions: squares.sessions,
                    weeksTrained: squares.weeksTrained,
                    bestStreak: squares.bestStreak,
                    currentStreak: squares.currentStreak,
                  })
                }
                fileName={`liftos-${year}.png`}
                title={`${year} in training`}
                alt={`${year}: ${String(squares.sessions)} sessions`}
              />
            )}
            <Link
              viewTransition
              to={`/year/${previous}`}
              aria-label={`Year ${previous}`}
              className="text-ink-300 hover:text-accent-400 tap-target flex items-center px-2"
            >
              <ChevronLeft size={18} aria-hidden />
            </Link>
            {next <= today.slice(0, 4) ? (
              <Link
                viewTransition
                to={`/year/${next}`}
                aria-label={`Year ${next}`}
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

      <section className="hero-panel p-5 sm:p-6" aria-label="The year's streaks">
        {squares.sessions === 0 ? (
          <p className="text-ink-300 text-sm">
            Nothing trained in {year} yet. A finished session lights its day, and the weeks in a row
            count up here.
          </p>
        ) : (
          <dl className="grid grid-cols-3 gap-3">
            <Figure label="Weeks trained" value={squares.weeksTrained} />
            <Figure label="Best streak" value={squares.bestStreak} unit="wk" />
            <Figure label="Current" value={squares.currentStreak} unit="wk" />
          </dl>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {squares.months.map((month) => (
          <Card key={month.month} className="p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <Link
                viewTransition
                to={`/month/${month.month}`}
                className="text-ink-100 hover:text-accent-400 text-sm font-medium"
              >
                {monthName(month.month)}
              </Link>
              <span className="numeric text-ink-500 text-[0.65rem]">
                {month.sessions > 0 ? `${String(month.sessions)} · ${String(month.sets)} sets` : ''}
              </span>
            </div>
            <MonthSquares month={month.month} days={squares.days} today={today} />
          </Card>
        ))}
      </div>
    </div>
  )
}

function MonthSquares({
  month,
  days,
  today,
}: {
  readonly month: string
  readonly days: Readonly<Record<string, number>>
  readonly today: string
}) {
  const first = `${month}-01`
  const lead = (new Date(`${first}T00:00:00`).getDay() + 6) % 7
  const cells: (string | undefined)[] = Array.from({ length: lead }, () => undefined)
  for (let day = first; day.startsWith(month); day = shiftDay(day, 1)) cells.push(day)

  return (
    /*
     * Hidden from screen readers: a square per day was 365 lines of "0 sets"
     * to listen through. The card's month link and its count say the month,
     * and the month page lists the days.
     */
    <ol className="grid grid-cols-7 gap-[3px]" aria-hidden>
      {cells.map((day, at) =>
        day === undefined ? (
          <li key={`lead-${String(at)}`} aria-hidden />
        ) : (
          <li
            key={day}
            title={days[day] === undefined ? day : `${day}: ${String(days[day])} sets`}
            className={cn(
              'aspect-square rounded-[3px]',
              day > today && 'opacity-30',
              day === today && 'ring-ink-50 ring-1',
            )}
            style={{ background: shade(days[day] ?? 0) }}
          ></li>
        ),
      )}
    </ol>
  )
}

function shade(sets: number): string {
  const band = BANDS.filter((floor) => sets >= floor).length
  if (band === 0) return 'var(--color-ink-800)'
  return `color-mix(in oklab, var(--color-accent-500) ${String(25 + band * 18)}%, var(--color-ink-800))`
}

function Figure({
  label,
  value,
  unit,
}: {
  readonly label: string
  readonly value: number
  readonly unit?: string
}) {
  return (
    <div>
      <dt className="text-ink-500 text-[0.65rem] tracking-wide uppercase">{label}</dt>
      <dd className="numeric text-ink-50 mt-1 text-3xl font-semibold">
        {value}
        {unit !== undefined && <span className="text-ink-500 ml-1 text-sm">{unit}</span>}
      </dd>
    </div>
  )
}

function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' })
}
