import type { CSSProperties } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Feather, Minus } from 'lucide-react'

import { SessionNote } from '@/features/history/SessionNote'
import { ShareSession } from '@/features/share/ShareSession'
import { shareCardFrom } from '@/features/share/card-from'
import type { WorkoutReport } from '@/application/use-cases/training/finish-workout'
import { MUSCLE_GROUP_LABELS } from '@/domain/exercises/taxonomy'
import { describeHeft, heftOf } from '@/domain/units/heft'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { Module } from '@/components/shared/Module'
import { Button } from '@/components/shared/primitives'
import { useSettings } from '@/app/context'

import { RecordChip } from './RecordChip'
import { SessionTimeline } from './SessionTimeline'
import { Debrief } from './Debrief'
import { useExercises, useRecentWorkouts } from './hooks'
import { useCountUp } from './useCountUp'
import { splitDayLabel } from './useNextSession'
import { sessionCrest } from '@/domain/logging/crest'
import { SessionCrest } from '@/features/history/SessionCrest'

/**
 * What happened, immediately after finishing.
 *
 * **The first screen is the verdict, and Done is under the thumb.** The crest,
 * what the session moved, the records, and three plain lines on what it means
 * for next time. It was a panel and four cards, every one the same weight, so
 * the records sat under a stat strip and the part a coach would say on the way
 * out was mid-paragraph. Reading on is the exception: how each lift did, the
 * note, and then the sets by muscle and the timing, folded, because they are
 * for looking something up rather than for the moment.
 */

interface Props {
  readonly report: WorkoutReport
  readonly units: WeightUnit
  readonly onDismiss: () => void
}

/**
 * The estimate this session just measured, offered to the setting it is
 * the basis for.
 *
 * The number was already on this screen and there was no way to keep it.
 * `estimatedMaxes` drives every suggested load in the app, the session
 * had just produced a better reading of it than the stored one, and the
 * only route between the two was reading the figure off here and typing
 * it into Settings from memory. That is the same defect as a rule
 * nothing can reach, wearing the clothes of a completed feature.
 *
 * **Offered, never applied.** It is a proposal with its evidence beside
 * it — the same stance the file import takes, and the same one
 * `adjust-landmarks` was built with. An estimate that moved on its own
 * after every session would make the loads shift for reasons the lifter
 * did not choose and could not see.
 *
 * Unreliable readings are excluded rather than shown with a warning: a
 * set of fifteen produces a number the formula is not fitted for, and
 * writing it into the basis for every future load is worse than leaving
 * the basis alone.
 */
function ApplyEstimates({ progress }: { readonly progress: WorkoutReport['progress'] }) {
  const { settings, update } = useSettings()

  const worth = progress.filter((entry) => {
    if (entry.estimate?.isReliable !== true) return false

    const stored = settings.estimatedMaxes[entry.exerciseId]
    if (stored === undefined) return true

    // A pound either way is the rounding, not a stronger lifter.
    return Math.abs(entry.estimate.value - stored) >= 1
  })

  if (worth.length === 0) return null

  return (
    <div className="border-ink-800 mt-3 border-t pt-3">
      <p className="text-ink-500 mb-2 text-[0.8125rem]">
        {worth.length === 1 ? 'This reading differs' : 'These readings differ'} from what your
        suggested loads are based on. Nothing changes unless you say so.
      </p>

      <ul className="mb-2 space-y-1">
        {worth.map((entry) => {
          const stored = settings.estimatedMaxes[entry.exerciseId]

          return (
            <li key={entry.exerciseId} className="flex justify-between gap-3 text-sm">
              <span className="text-ink-300 truncate">{entry.name}</span>
              <span className="text-ink-500 numeric shrink-0">
                {stored === undefined ? 'not set' : formatLoad(stored, settings.units)} →{' '}
                <span className="text-ink-100">
                  {formatLoad(Math.round(entry.estimate?.value ?? 0), settings.units)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <Button
        variant="outline"
        full
        onClick={() => {
          update({
            estimatedMaxes: {
              ...settings.estimatedMaxes,
              ...Object.fromEntries(
                worth.map(
                  (entry) => [entry.exerciseId, Math.round(entry.estimate?.value ?? 0)] as const,
                ),
              ),
            },
          })
        }}
      >
        Use {worth.length === 1 ? 'this estimate' : 'these estimates'}
      </Button>
    </div>
  )
}

export function SessionReport({ report, units, onDismiss }: Props) {
  const exercises = useExercises()
  const history = useRecentWorkouts(500)
  const crest = sessionCrest(
    report.workout,
    new Set(report.records.map((record) => record.exerciseId)),
  )
  /* A session on the body alone moved no load, so its figure is its sets. */
  const loaded = report.tonnage > 0
  const total = loaded ? Math.round(report.tonnage) : report.workingSets
  const shown = Math.round(useCountUp(total))
  const heft = heftOf(report.tonnage, units)

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <section className="first-screen flex flex-col" aria-labelledby="report-title">
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-500 text-sm">Session complete</p>
          <ShareSession
            card={shareCardFrom({
              title: report.workout.title,
              date: report.workout.date,
              sets: report.workingSets,
              tonnage: report.tonnage,
              minutes: report.durationMinutes,
              units,
              crest,
              records: report.records,
            })}
          />
        </div>

        <div
          className="mt-2 flex items-center justify-between gap-4"
          // The session bar grows into this on finish; see `HomePage`.
          style={{ viewTransitionName: 'session-hero' }}
        >
          <h1 id="report-title" className="min-w-0 text-[3.5rem] leading-none font-bold">
            {splitDayLabel(report.workout.title).name}
          </h1>
          <SessionCrest
            crest={crest}
            library={exercises.data ?? []}
            className="report-crest size-20 shrink-0"
          />
        </div>
        <p className="text-ink-300 mt-2 text-[0.9375rem]">{report.headline}</p>

        <p className="font-display mt-4 flex flex-wrap items-baseline gap-x-2 leading-none">
          <span aria-hidden className="text-[4rem] leading-[1.05] font-bold tracking-[-0.03em]">
            {shown.toLocaleString()}
          </span>
          <span className="sr-only">{total.toLocaleString()}</span>
          <span className="text-ink-500 text-lg">{loaded ? `${units} moved` : 'sets'}</span>
        </p>
        <p className="numeric text-ink-500 mt-1 text-sm">
          {loaded && (
            <>
              <span className="text-ink-100">{report.workingSets}</span>{' '}
              {report.workingSets === 1 ? 'set' : 'sets'}
            </>
          )}
          {report.durationMinutes > 0 && (
            <>
              {loaded && ' · '}
              <span className="text-ink-100">{report.durationMinutes}</span> min
            </>
          )}
          {heft !== undefined && <span className="heft-line"> · about {describeHeft(heft)}</span>}
        </p>

        {report.records.length > 0 && (
          <ul className="mt-4 space-y-1.5" aria-label="New records">
            {report.records.map((record, at) => (
              <li
                key={record.exerciseId}
                className="record-in flex items-center justify-between gap-3"
                style={{ '--i': at } as CSSProperties}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate">{record.name}</span>
                  <span className="numeric text-gold-400 shrink-0 text-sm">
                    {record.set.load === undefined || record.set.load <= 0
                      ? 'BW'
                      : formatLoad(record.set.load, units)}{' '}
                    × {record.set.reps ?? '—'}
                  </span>
                </span>
                <RecordChip kind={record.kind} />
              </li>
            ))}
          </ul>
        )}

        {history.data !== undefined && (
          <Debrief
            workout={report.workout}
            history={history.data}
            library={exercises.data ?? []}
            units={units}
          />
        )}

        <div
          className="bg-ink-950 sticky bottom-0 z-10 -mx-4 mt-auto px-4 pt-3 sm:mx-0 sm:px-0"
          style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
        >
          <Button
            variant="primary"
            full
            className="font-display h-[4.5rem] rounded-[1.25rem] text-[1.375rem]"
            onClick={onDismiss}
          >
            Done
          </Button>
        </div>
      </section>

      {report.progress.length > 0 && (
        <Module title="Against last time">
          <ul className="divide-ink-800 mt-1 divide-y">
            {report.progress.map((entry) => (
              <li
                key={entry.exerciseId}
                className="flex min-h-11 items-center justify-between gap-3 py-1"
              >
                <span className="truncate text-[0.9375rem]">{entry.name}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {entry.estimate !== undefined && (
                    <span className="text-ink-500 numeric text-[0.8125rem]">
                      e1RM {formatLoad(Math.round(entry.estimate.value), units)}
                      {!entry.estimate.isReliable && '*'}
                      {entry.estimate.reserve > 0 && '\u2020'}
                    </span>
                  )}
                  <Verdict verdict={entry.verdict} />
                </span>
              </li>
            ))}
          </ul>
          <div className="text-ink-500 mt-2 space-y-1.5 text-[0.8125rem]">
            {report.progress.some((entry) => entry.estimate?.isReliable === false) && (
              <p>* Estimated from a high-rep set, where the formulas lose accuracy.</p>
            )}
            {report.progress.some((entry) => (entry.estimate?.reserve ?? 0) > 0) && (
              <p>
                {'\u2020'} Read with reps in reserve: a set repeated across straight sets was not a
                limit set, so each extra set counts as one more rep, up to three.
              </p>
            )}
            {report.progress.some((entry) => entry.verdict === 'lighter') && (
              <p>
                A deload drops the bar on purpose, so lighter than last time is the plan. The week
                after picks up from the bars before it.
              </p>
            )}
          </div>

          <ApplyEstimates progress={report.progress} />
        </Module>
      )}

      <SessionNote workoutId={report.workout.id} initial={report.workout.notes} />

      <details className="border-ink-800 group border-t">
        <summary className="text-ink-500 flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Sets by muscle and timing
          <ChevronDown
            size={16}
            className="transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="space-y-4 pb-2">
          {report.volumeByMuscle.length > 0 && (
            <div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {report.volumeByMuscle.map(({ muscle, sets }) => (
                  <li key={muscle} className="flex justify-between text-sm">
                    <span className="text-ink-300">{MUSCLE_GROUP_LABELS[muscle]}</span>
                    <span className="numeric text-ink-100 font-medium">{sets}</span>
                  </li>
                ))}
              </ul>
              <p className="text-ink-500 mt-2 text-[0.8125rem]">
                Counted whole, and only for the muscle each exercise is programmed for.
              </p>
            </div>
          )}
          <TimelineCard workout={report.workout} />
        </div>
      </details>
    </div>
  )
}

/*
 * Words in quiet ink, and never red: a set that came in under is information,
 * the rule every other screen holds. Only "up" spends the accent.
 */
function Verdict({ verdict }: { readonly verdict: WorkoutReport['progress'][number]['verdict'] }) {
  const quiet = 'flex w-16 items-center justify-end gap-1 text-[0.8125rem]'
  switch (verdict) {
    case 'better':
      return (
        <span className={`${quiet} text-accent-400 font-semibold`}>
          <ArrowUp size={12} aria-hidden />
          Up
        </span>
      )
    case 'worse':
      return (
        <span className={`${quiet} text-ink-300`}>
          <ArrowDown size={12} aria-hidden />
          Down
        </span>
      )
    case 'lighter':
      return (
        <span className={`${quiet} text-cool-500`}>
          <Feather size={12} aria-hidden />
          Deload
        </span>
      )
    case 'matched':
      return (
        <span className={`${quiet} text-ink-500`}>
          <Minus size={12} aria-hidden />
          Held
        </span>
      )
    case 'new':
      return <span className={`${quiet} text-ink-300`}>First</span>
  }
}

/** The timeline, with names from the library. */
function TimelineCard({ workout }: { readonly workout: WorkoutReport['workout'] }) {
  const exercises = useExercises()
  return (
    <SessionTimeline
      workout={workout}
      nameOf={(id) => exercises.data?.find((one) => one.id === id)?.name ?? id}
    />
  )
}
