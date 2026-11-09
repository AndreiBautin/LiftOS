import type { CSSProperties } from 'react'
import { LIFT_COLOURS } from '@/features/charts/palette'
import { Navigate, useParams } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { RECORD_LABELS } from '@/domain/logging/records'
import { monthRecap, monthsTrained, type MonthRecap } from '@/domain/logging/month'
import { toDayKey } from '@/domain/time/day'
import { describeHeft, heftOf } from '@/domain/units/heft'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { DetailHero } from '@/components/shared/DetailHero'
import { Module } from '@/components/shared/Module'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { LookBack } from '@/features/look-back/LookBack'
import { ShareSession } from '@/features/share/ShareSession'
import { useExercises, useRecentWorkouts } from '@/features/train/hooks'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format-date'

const LIFT_NAMES = { squat: 'Squat', bench: 'Bench press', deadlift: 'Deadlift' } as const

/**
 * A month of training on one page (`monthRecap`): the totals against the
 * month before, the month as a calendar with each trained day lit by how
 * much was done, how far each competition lift's estimate moved, and the
 * records set. Stepped month to month, and shared as a picture with the
 * session card's renderer.
 *
 * **Its picture is the calendar**, laid out as the month actually falls,
 * Monday first — a month is read as weeks on a wall, which the training
 * grid's eighteen-week strip is too long and too thin to be.
 */
export function MonthPage() {
  const { month } = useParams()
  const { settings } = useSettings()
  const today = toDayKey(useServices().clock.now())
  const workouts = useRecentWorkouts(1000)
  const exercises = useExercises()

  if (workouts.data === undefined) return <PageSkeleton title="Month" />
  const months = monthsTrained(workouts.data)
  if (month === undefined) {
    const latest = months[0]
    return latest === undefined ? (
      <LookBack
        view="month"
        period="Month"
        older={undefined}
        newer={undefined}
        olderLabel="Earlier month"
        newerLabel="Later month"
      >
        <p className="text-ink-500 text-sm">A finished session starts the first month here.</p>
      </LookBack>
    ) : (
      <Navigate to={`/month/${latest}`} replace />
    )
  }

  const recap = monthRecap(workouts.data, month, today)
  const at = months.indexOf(month)
  const newer = at > 0 ? months[at - 1] : undefined
  const older = at === -1 ? months[0] : months[at + 1]
  const nameOf = (id: string) => exercises.data?.find((one) => one.id === id)?.name ?? id
  const title = monthName(month, today)

  return (
    <LookBack
      view="month"
      period={title}
      subtitle={`${String(recap.sessions)} sessions · ${String(Object.keys(recap.days).length)} days trained`}
      older={older === undefined ? undefined : `/month/${older}`}
      newer={newer === undefined ? undefined : `/month/${newer}`}
      olderLabel="Earlier month"
      newerLabel="Later month"
      play={recap.sessions > 0 ? `/wrapped/${month}` : undefined}
      share={
        recap.sessions > 0 ? (
          <ShareSession
            card={{
              eyebrow: 'Month in lifting',
              title,
              date: `${month}-01`,
              dateLine: `${String(recap.sessions)} sessions · ${String(Object.keys(recap.days).length)} days trained`,
              sets: recap.sets,
              volume: `${Math.round(recap.tonnage).toLocaleString()} ${settings.units}`,
              minutes: Math.round(recap.minutes / 60),
              timeLabel: 'Hours',
              ...heftLine(recap.tonnage, settings.units),
              /*
               * The month's picture leads with what each lift's estimate
               * did — four of thirty records picked by date said little —
               * and falls back to records when no lift was measured.
               */
              records:
                recap.lifts.length > 0
                  ? recap.lifts.map(({ lift, from, to }) => ({
                      name: LIFT_NAMES[lift],
                      detail: `${to - from >= 0 ? '+' : ''}${String(to - from)} ${settings.units}`,
                      label: `Estimated max ${String(from)} → ${String(to)}`,
                    }))
                  : recap.records.slice(0, 4).map((record) => ({
                      name: nameOf(record.exerciseId),
                      detail: `${record.set.load === undefined ? 'BW' : formatLoad(record.set.load, settings.units)} × ${String(record.set.reps ?? '—')}`,
                      label: RECORD_LABELS[record.kind],
                    })),
              recordsHeading:
                recap.lifts.length > 0
                  ? `${String(recap.records.length)} records · the lifts`
                  : undefined,
            }}
          />
        ) : undefined
      }
    >
      <DetailHero
        label="Month totals"
        figure={recap.sets.toLocaleString()}
        unit={`sets${withChange(recap.sets, recap.previous.sets)}`}
        facts={[
          {
            term: 'Volume',
            value: `${Math.round(recap.tonnage).toLocaleString()} ${settings.units}${withChange(recap.tonnage, recap.previous.tonnage)}`,
          },
          {
            term: 'Hours',
            value: `${String(Math.round(recap.minutes / 60))}${withChange(recap.minutes, recap.previous.minutes)}`,
          },
        ]}
      >
        {recap.previous.sessions > 0 && (
          <p className="text-ink-500 mt-1 text-[0.8125rem]">
            Against{' '}
            {recap.previousThrough.endsWith('-31')
              ? monthName(recap.previousThrough.slice(0, 7), today)
              : `${shortDay(`${recap.previousThrough.slice(0, 7)}-01`)}–${String(Number(recap.previousThrough.slice(8)))}`}
          </p>
        )}
        <MonthCalendar recap={recap} today={today} />
      </DetailHero>

      {recap.lifts.length > 0 && (
        <div className="mt-4">
          <Module title="Estimated max, start to end of month">
            <ul className="mt-1 space-y-2">
              {recap.lifts.map(({ lift, from, to }) => (
                <li key={lift} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: LIFT_COLOURS[lift] }}
                      aria-hidden
                    />
                    {LIFT_NAMES[lift]}
                  </span>
                  <span className="numeric text-ink-500">
                    {from} → <span className="text-ink-50 font-semibold">{to}</span>
                    {to === from ? '' : ` · ${to > from ? '+' : '−'}${String(Math.abs(to - from))}`}
                  </span>
                </li>
              ))}
            </ul>
          </Module>
        </div>
      )}

      {recap.records.length > 0 && (
        <Module
          title={`${String(recap.records.length)} ${recap.records.length === 1 ? 'record' : 'records'}`}
        >
          <ul className="mt-1 space-y-2">
            {recap.records.map((record) => (
              <li
                key={`${record.exerciseId}-${record.date}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate">{nameOf(record.exerciseId)}</span>
                  <span className="text-ink-500 text-[0.8125rem]">
                    {shortDay(record.date)} · {RECORD_LABELS[record.kind]}
                  </span>
                </span>
                <span className="numeric text-gold-400 shrink-0 font-semibold">
                  {record.set.load === undefined
                    ? 'BW'
                    : formatLoad(record.set.load, settings.units)}{' '}
                  × {record.set.reps ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </Module>
      )}
    </LookBack>
  )
}

/** ", +12%" against the month before. Quiet either way: a lighter month is often the plan. */
function withChange(now: number, before: number): string {
  if (before <= 0) return ''
  const percent = Math.round(((now - before) / before) * 100)
  return percent === 0 ? '' : `, ${percent > 0 ? '+' : '−'}${String(Math.abs(percent))}%`
}

/** The month as it falls on a wall calendar, Monday first; a trained day lit by its sets. */
function MonthCalendar({ recap, today }: { readonly recap: MonthRecap; readonly today: string }) {
  const [year = 2000, number = 1] = recap.month.split('-').map(Number)
  const first = new Date(year, number - 1, 1)
  const length = new Date(year, number, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const most = Math.max(1, ...Object.values(recap.days))

  return (
    <div className="mt-4 lg:max-w-md">
      <div className="text-ink-500 mb-1.5 grid grid-cols-7 gap-1.5 text-center text-xs">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, index) => (
          <span key={index} aria-hidden>
            {letter}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Days trained">
        {Array.from({ length: lead }, (_, index) => (
          <li key={`lead-${String(index)}`} aria-hidden />
        ))}
        {Array.from({ length }, (_, index) => {
          const day = `${recap.month}-${String(index + 1).padStart(2, '0')}`
          const sets = recap.days[day] ?? 0
          return (
            <li
              key={day}
              aria-label={sets === 0 ? undefined : `${shortDay(day)}: ${String(sets)} sets`}
              className={cn(
                'numeric flex aspect-square items-center justify-center rounded-lg text-xs',
                sets === 0 ? 'text-ink-500 bg-ink-900' : 'month-lit text-ink-950 font-semibold',
                day === today && 'ring-accent-400 ring-2',
                day > today && 'opacity-40',
              )}
              style={
                sets === 0
                  ? undefined
                  : ({
                      background: `color-mix(in oklab, var(--color-accent-400) ${String(
                        Math.round(45 + (sets / most) * 55),
                      )}%, transparent)`,
                      '--i': index,
                    } as CSSProperties)
              }
            >
              {index + 1}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function heftLine(tonnage: number, units: WeightUnit): { readonly heft?: string } {
  const heft = heftOf(tonnage, units)
  return heft === undefined ? {} : { heft: `about ${describeHeft(heft)}` }
}

function monthName(month: string, today: string): string {
  return formatDate(new Date(`${month}-01T00:00:00`), {
    month: 'long',
    ...(month.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
  })
}

function shortDay(day: string): string {
  return formatDate(new Date(`${day}T00:00:00`), {
    month: 'short',
    day: 'numeric',
  })
}
