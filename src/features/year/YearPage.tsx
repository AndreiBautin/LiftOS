import { Link, useParams } from 'react-router-dom'

import { useServices } from '@/app/context'
import { yearInSquares } from '@/domain/logging/year'
import { shiftDay, toDayKey } from '@/domain/time/day'
import { DetailHero } from '@/components/shared/DetailHero'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { LookBack } from '@/features/look-back/LookBack'
import { useRecentWorkouts } from '@/features/train/hooks'
import { SharePicture } from '@/features/share/ShareSession'
import { drawYearCard } from '@/features/share/year-card'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format-date'

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
  /*
   * The months the year has had. Before the first session and past today they
   * are blank squares to scroll by on a phone, in the way of the months that
   * were trained; an empty year still shows its months as a wall planner would.
   */
  const started = squares.months.findIndex((one) => one.sessions > 0)
  const months = squares.months.filter(
    (one, at) => started === -1 || (at >= started && one.month <= today.slice(0, 7)),
  )

  return (
    <LookBack
      view="year"
      period={year}
      subtitle={`${String(squares.sessions)} sessions · ${String(squares.daysTrained)} days trained`}
      older={`/year/${previous}`}
      newer={next <= today.slice(0, 4) ? `/year/${next}` : undefined}
      olderLabel={`Year ${previous}`}
      newerLabel={`Year ${next}`}
      play={squares.sessions > 0 ? `/wrapped/${year}` : undefined}
      share={
        squares.sessions > 0 ? (
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
        ) : undefined
      }
    >
      {squares.sessions === 0 ? (
        <p className="text-ink-500 mb-4 text-sm">
          Nothing trained in {year} yet. A finished session lights its day, and the weeks in a row
          count up here.
        </p>
      ) : (
        <DetailHero
          label="The year's streaks"
          figure={String(squares.weeksTrained)}
          unit="weeks trained"
          facts={[
            { term: 'Best streak', value: `${String(squares.bestStreak)} wk` },
            { term: 'Current', value: `${String(squares.currentStreak)} wk` },
          ]}
        />
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
        {months.map((month) => (
          <div key={month.month}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Link viewTransition to={`/month/${month.month}`} className="text-sm font-medium">
                {monthName(month.month)}
              </Link>
              <span className="numeric text-ink-500 text-xs">
                {month.sessions > 0 ? `${String(month.sets)} sets` : ''}
              </span>
            </div>
            <MonthSquares month={month.month} days={squares.days} today={today} />
          </div>
        ))}
      </div>
    </LookBack>
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
              'year-day aspect-square rounded-[3px]',
              day > today && 'opacity-30',
              day === today && 'year-today ring-ink-50 ring-1',
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

function monthName(month: string): string {
  return formatDate(new Date(`${month}-01T00:00:00`), { month: 'short' })
}
