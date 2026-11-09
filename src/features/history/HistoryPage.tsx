import { Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useSettings } from '@/app/context'
import { Empty } from '@/components/shared/primitives'
import { MorphText } from '@/components/shared/MorphText'
import { morphName } from '@/components/shared/morph'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import type { Exercise } from '@/domain/exercises/exercise'
import { sessionCrest } from '@/domain/logging/crest'
import { filterHistory } from '@/domain/logging/history-filter'
import { historyTimeline, type TimelineSession } from '@/domain/logging/history-timeline'
import { sessionRecords, type SessionRecord } from '@/domain/logging/records'
import { totalTonnage, totalWorkingSets } from '@/domain/logging/workout-log'
import type { WeightUnit } from '@/domain/units/weight'
import { MoveGlyph } from '@/features/glyphs/MoveGlyph'
import { useExercises, useRecentWorkouts } from '@/features/train/hooks'
import { splitDayLabel } from '@/features/train/useNextSession'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format-date'

import { SessionCrest } from './SessionCrest'

/** The same window the training grid reads. */
const WINDOW = 2000
/** Months drawn before "Show older": a crest per session is not nothing. */
const MONTHS = 3

/**
 * Every session on one line through time, each one its crest.
 *
 * **It replaced a list, a wall of crests and a toggle between them.** A crest
 * is cut by the session's own exercises, so a run of sessions reads as a shape
 * before a word of it is read; a row beside it says the rest. Breaks are said
 * where they happened (`historyTimeline`), which a list could not show.
 *
 * **One field, no chips.** It searched and then had six day chips, a Records
 * chip and the view toggle under it, on a screen you came to read. The field
 * finds a day, a lift, a note, or "records" (`filterHistory`). The search is in
 * the address, so Back from a session lands on the same results.
 *
 * **Nothing here deletes.** A trash can on every row sat a thumb's width from
 * the link, for an act done a few times a year. Delete and reopen are on the
 * session's own page, where what is about to go is on screen.
 *
 * A screen of its own rather than part of Today because a list you dip into
 * has to survive Back: expanded in place, it collapsed every time you returned
 * from a session.
 */
export function HistoryPage() {
  const { settings } = useSettings()
  const workouts = useRecentWorkouts(WINDOW)
  const exercises = useExercises()
  const [params, setParams] = useSearchParams()
  const [older, setOlder] = useState(false)
  const query = params.get('q') ?? ''
  const records = useMemo(() => sessionRecords(workouts.data ?? []), [workouts.data])

  if (workouts.data === undefined) return <PageSkeleton title="History" />

  const sessions = workouts.data.filter(
    (log) => log.status === 'completed' || log.status === 'abandoned',
  )
  const searching = query.trim() !== ''
  const library = exercises.data ?? []
  const nameOf = (id: string) => library.find((one) => one.id === id)?.name ?? id
  const matches = searching
    ? filterHistory(sessions, query, nameOf, (id) => records.get(id)?.length ?? 0)
    : sessions
  const months = historyTimeline(matches, { withBreaks: !searching })
  const shown = searching || older ? months : months.slice(0, MONTHS)

  return (
    <div className="mx-auto max-w-2xl pb-8 lg:max-w-5xl">
      <PageHeader
        title="History"
        subtitle={
          searching
            ? `${String(matches.length)} of ${String(sessions.length)} sessions`
            : `${String(sessions.length)} ${sessions.length === 1 ? 'session' : 'sessions'}`
        }
      />

      {sessions.length === 0 ? (
        <Empty title="Nothing logged yet" art={<MoveGlyph glyph="squat" size={32} />}>
          <p>Finish a session and it will appear here.</p>
        </Empty>
      ) : (
        <>
          <label className="relative block lg:max-w-md">
            <span className="sr-only">Search sessions</span>
            <Search
              size={16}
              className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              placeholder="A day, a lift, a note, or records"
              onChange={(event) => {
                const next = event.target.value
                // Replacing, so Back leaves the page rather than untyping the search.
                setParams(next === '' ? {} : { q: next }, { replace: true })
              }}
              className="bg-ink-900 border-ink-800 text-ink-100 placeholder:text-ink-500 h-12 w-full rounded-[0.875rem] border pr-3 pl-10"
            />
          </label>

          {matches.length === 0 && (
            <p className="text-ink-500 py-6 text-center text-sm">
              Nothing matches.{' '}
              <button
                type="button"
                className="text-accent-400 tap-target"
                onClick={() => {
                  setParams({}, { replace: true })
                }}
              >
                Clear
              </button>
            </p>
          )}

          <div className="mt-5 space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10 lg:gap-y-6 lg:space-y-0">
            {shown.map(({ month, sessions: inMonth }) => (
              <section key={month} aria-label={monthName(month)}>
                <h2 className="text-ink-500 mb-1 font-sans text-sm font-medium tracking-normal">
                  {monthName(month)}
                  <span className="numeric"> · {inMonth.length}</span>
                </h2>
                <ol className="relative">
                  {/* The line through time, behind the crests. */}
                  <span
                    aria-hidden
                    className="bg-ink-800 absolute top-2 bottom-2 left-[1.75rem] w-px"
                  />
                  {inMonth.map((session) => (
                    <Row
                      key={session.log.id}
                      session={session}
                      records={records.get(session.log.id) ?? []}
                      library={library}
                      units={settings.units}
                    />
                  ))}
                </ol>
              </section>
            ))}
          </div>

          {!searching && !older && months.length > MONTHS && (
            <button
              type="button"
              className="text-accent-400 tap-target mt-4 text-sm font-medium"
              onClick={() => {
                setOlder(true)
              }}
            >
              Show {months.length - MONTHS} older{' '}
              {months.length - MONTHS === 1 ? 'month' : 'months'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Row({
  session,
  records,
  library,
  units,
}: {
  readonly session: TimelineSession
  readonly records: readonly SessionRecord[]
  readonly library: readonly Exercise[]
  readonly units: WeightUnit
}) {
  const { log, weeksOffBefore } = session
  const name = splitDayLabel(log.title).name
  const sets = totalWorkingSets(log)
  const when = new Date(`${log.date}T00:00:00`)
  return (
    <>
      <li>
        <Link
          viewTransition
          to={`/session/${log.id}`}
          className="relative flex min-h-[4.5rem] items-center gap-3.5"
        >
          <span className="bg-ink-950 shrink-0 rounded-full">
            <SessionCrest
              crest={sessionCrest(log, new Set(records.map((record) => record.exerciseId)))}
              library={library}
              className={cn('size-14', log.status === 'abandoned' && 'opacity-40')}
              still
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <MorphText
                to={`/session/${log.id}`}
                name={morphName('session', log.id)}
                className="truncate font-medium"
              >
                {name}
              </MorphText>
              {log.status === 'abandoned' && (
                <span className="text-warn-500 shrink-0 text-[0.8125rem]">Abandoned</span>
              )}
              {records.length > 0 && (
                <span
                  className="text-gold-400 numeric flex shrink-0 items-center gap-0.5 text-[0.8125rem]"
                  aria-label={`${String(records.length)} ${records.length === 1 ? 'record' : 'records'}`}
                >
                  <Star size={12} fill="currentColor" aria-hidden />
                  {records.length}
                </span>
              )}
            </span>
            <span className="numeric text-ink-500 block truncate text-[0.8125rem]">
              {formatDate(when, { weekday: 'short', month: 'short', day: 'numeric' })} · {sets}{' '}
              {sets === 1 ? 'set' : 'sets'} · {Math.round(totalTonnage(log)).toLocaleString()}{' '}
              {units}
            </span>
          </span>
        </Link>
      </li>
      {weeksOffBefore !== undefined && (
        <li className="text-ink-500 relative flex min-h-9 items-center pl-[4.875rem] text-[0.8125rem]">
          {weeksOffBefore} {weeksOffBefore === 1 ? 'week' : 'weeks'} off
        </li>
      )}
    </>
  )
}

function monthName(month: string): string {
  return formatDate(new Date(`${month}-01T00:00:00`), { month: 'long', year: 'numeric' })
}
