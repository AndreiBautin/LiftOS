import { LayoutGrid, Play, Plus, SlidersHorizontal } from 'lucide-react'
import { MoveSession } from './MoveSession'
import { Suspense, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { lazyNamed } from '@/lib/lazy-named'
import { SyncBadge } from '@/features/sync/SyncBadge'
import { RestedFor } from './RestedFor'
import { Button } from '@/components/shared/primitives'
import { buttonStyles } from '@/components/shared/styles'
import { bestsByExercise } from '@/domain/logging/bests'
import { blockWindow } from '@/domain/logging/block'
import { ripeLifts } from '@/domain/logging/ripe'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { adherence } from '@/domain/programs/adherence'
import { describeReps } from '@/domain/programs/prescription'
import type { ProgramDay } from '@/domain/programs/program'
import { liveMoves, weekIndexToStartOn } from '@/domain/programs/schedule'
import { applyDraft, isEmptyDraft } from '@/domain/programs/session-draft'
import { mondayOf, parseDay, shiftDay, WEEKDAY_LABELS } from '@/domain/time/day'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { DeloadSuggestion } from '@/features/train/DeloadSuggestion'
import {
  useExercises,
  useJumpToWeek,
  useMuscleRecency,
  useProgram,
  useRecentWorkouts,
  useSchedule,
  useSessionPreview,
  useStartWorkout,
  useWeekSummary,
} from '@/features/train/hooks'
import { splitDayLabel, useNextSession } from '@/features/train/useNextSession'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format-date'

/**
 * The top of the page is the session.
 *
 * **Everything you came to find out is on the first screen and Start is under
 * your thumb**: which session, today's bar on each lift, and where the week
 * stands. It was a hero that named the session, a plan card a screen below
 * that said what was in it, and a card beside that for what had moved, so
 * starting informed took a scroll and a scroll back.
 *
 * The bars are `previewWorkout`, Start's own build run early and saved nowhere,
 * so this cannot promise what the session will not open. Which day it is comes
 * from `useNextSession`, the calendar's one answer.
 *
 * **The dock is sticky to this section and no further.** Past the session you
 * are reading about something else, and a Start following you into the charts
 * would be a button with nothing to do with the screen.
 */
export function HeroBanner() {
  const { clock } = useServices()
  const { settings, update } = useSettings()
  const {
    day,
    week,
    program,
    when,
    doneToday,
    restDay,
    here,
    on,
    today: todayKey,
    carriedFrom,
  } = useNextSession()
  const summary = useWeekSummary()
  const startWorkout = useStartWorkout()
  const exercises = useExercises()
  const jumpToWeek = useJumpToWeek()
  const recency = useMuscleRecency()
  const preview = useSessionPreview()
  const [everything, setEverything] = useState(false)
  const [moving, setMoving] = useState(false)
  const [editing, setEditing] = useState(false)
  const closeEverything = useCallback(() => {
    setEverything(false)
  }, [])
  const closeEditor = useCallback(() => {
    setEditing(false)
  }, [])

  const label = day === undefined ? undefined : splitDayLabel(day.label)
  const dateLine = formatDate(clock.now(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const whenWord =
    when === 'today' ? 'Today' : when === 'tomorrow' ? 'Tomorrow' : (label?.weekday ?? 'Up next')
  const lead =
    carriedFrom !== undefined
      ? `Carried from ${formatDate(parseDay(carriedFrom), { weekday: 'long', timeZone: 'UTC' })}`
      : doneToday
        ? `Today’s done · ${whenWord}`
        : restDay
          ? `Rest day · ${whenWord}`
          : whenWord

  /* The plan as the draft leaves it, so what is shown is what Start opens. */
  const shown =
    day === undefined || on === undefined ? day : applyDraft(day, settings.sessionDraft, on)
  const drafted =
    settings.sessionDraft?.on === on &&
    settings.sessionDraft !== undefined &&
    !isEmptyDraft(settings.sessionDraft)

  const start = (freestyle?: boolean) => {
    startWorkout.mutate(freestyle === true ? { freestyleTitle: 'Open session' } : undefined, {
      onSuccess: () => {
        window.scrollTo({ top: 0 })
      },
    })
  }

  return (
    <section className="first-screen flex flex-col" aria-labelledby="hero-title">
      <header className="-mt-1 flex items-center justify-between gap-3">
        <p className="text-ink-500 min-w-0 truncate text-sm">
          {dateLine}
          {week?.label === undefined ? '' : ` · ${week.label}`}
        </p>
        <div className="-mr-2.5 flex shrink-0 items-center">
          <SyncBadge />
          <button
            type="button"
            aria-label="Everything"
            aria-haspopup="dialog"
            onClick={() => {
              setEverything(true)
            }}
            className={buttonStyles({ variant: 'ghost', className: 'px-2.5' })}
          >
            <LayoutGrid size={20} aria-hidden />
          </button>
          <Link
            viewTransition
            to="/settings"
            aria-label="Settings"
            className={buttonStyles({ variant: 'ghost', className: 'px-2.5' })}
          >
            <SlidersHorizontal size={20} aria-hidden />
          </Link>
        </div>
      </header>
      {everything && (
        <Suspense fallback={null}>
          <EverythingSheet onClose={closeEverything} />
        </Suspense>
      )}

      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="min-w-0">
          <h1 id="hero-title" className="mt-2 text-[3.5rem] leading-none font-bold">
            {label?.name ?? 'Your next session'}
          </h1>
          <div className="text-ink-500 mt-1 flex flex-wrap items-center gap-x-3 text-sm">
            <span>{lead}</span>
            {week?.isDeload === true && <span className="text-cool-500">Deload</span>}
            {program !== undefined &&
              on !== undefined &&
              todayKey !== undefined &&
              day !== undefined && (
                <MetaButton
                  expanded={moving}
                  onClick={() => {
                    setMoving(!moving)
                  }}
                >
                  {moving ? 'Keep it' : 'Move'}
                </MetaButton>
              )}
            {/*
              **A missed session is carried, not lost** (`carryForward`). Skip
              stores a move of nothing onto the missed day, which the carry
              then reads as nothing owed.
            */}
            {carriedFrom !== undefined && todayKey !== undefined && (
              <MetaButton
                onClick={() => {
                  update({
                    dayMoves: { ...liveMoves(settings.dayMoves, todayKey), [carriedFrom]: null },
                  })
                }}
              >
                Skip
              </MetaButton>
            )}
            {day !== undefined && on !== undefined && (
              <MetaButton
                onClick={() => {
                  setEditing(true)
                }}
              >
                Edit
              </MetaButton>
            )}
            {/*
              **The deload can be skipped from here**, the same write the
              Program page's week picker makes: the block starts again this
              week at week one.
            */}
            {week?.isDeload === true &&
              program !== undefined &&
              on !== undefined &&
              todayKey !== undefined && (
                <MetaButton
                  disabled={jumpToWeek.isPending}
                  onClick={() => {
                    // The week the session in view falls in becomes week one.
                    const weeksInBlock = program.blocks[here?.blockIndex ?? 0]?.weeks.length ?? 1
                    jumpToWeek.mutate({
                      program,
                      weekIndex: weekIndexToStartOn(on, todayKey, weeksInBlock),
                    })
                  }}
                >
                  Skip the deload
                </MetaButton>
              )}
          </div>
          {moving && program !== undefined && on !== undefined && todayKey !== undefined && (
            <MoveSession
              program={program}
              on={on}
              today={todayKey}
              onDone={() => {
                setMoving(false)
              }}
            />
          )}
          <WeekStrip streak={summary.data?.streakWeeks} today={todayKey} />
          {restDay && !doneToday && day !== undefined && recency.data !== undefined && (
            <RestedFor
              day={day}
              library={exercises.data ?? []}
              recency={recency.data}
              when={when === 'tomorrow' ? 'tomorrow' : (label?.weekday ?? 'the next session')}
            />
          )}
        </div>

        <div className="min-w-0 lg:pt-3">
          {shown !== undefined && (
            <SessionLifts
              day={shown}
              planned={preview.data ?? undefined}
              units={settings.units}
              drafted={drafted}
            />
          )}
          <DeloadSuggestion />
        </div>
      </div>

      <div
        className="bg-ink-950 sticky bottom-0 z-10 -mx-4 mt-auto flex gap-2.5 px-4 pt-2 sm:mx-0 sm:px-0 lg:mt-6 lg:max-w-md"
        style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
      >
        <Button
          variant="primary"
          className="font-display h-[4.5rem] min-w-0 flex-1 rounded-[1.25rem] text-[1.375rem]"
          disabled={day === undefined || startWorkout.isPending}
          onClick={() => {
            start()
          }}
        >
          <Play size={20} fill="currentColor" aria-hidden />
          {when === 'today' || when === undefined ? 'Start session' : 'Start it early'}
        </Button>
        <Button
          variant="outline"
          className="size-[4.5rem] shrink-0 rounded-[1.25rem] px-0"
          aria-label="Open session"
          disabled={startWorkout.isPending}
          onClick={() => {
            start(true)
          }}
        >
          <Plus size={22} aria-hidden />
        </Button>
      </div>

      {editing && day !== undefined && on !== undefined && (
        <BottomSheet label="Edit this session" title="Edit this session" onClose={closeEditor}>
          <Suspense fallback={null}>
            <SessionDraftEditor day={day} on={on} library={exercises.data ?? []} />
          </Suspense>
        </BottomSheet>
      )}
    </section>
  )
}

function MetaButton({
  children,
  onClick,
  expanded,
  disabled,
}: {
  readonly children: string
  readonly onClick: () => void
  readonly expanded?: boolean
  readonly disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      className="text-ink-50 min-h-8 font-medium disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/**
 * The week as seven days, the week's own answer to "how am I doing": done
 * filled, missed in amber, today ringed, the rest quiet. **By `adherence`**,
 * which asks `sessionOn` and matches by title within the week, so Monday's
 * session done on Friday is Monday done. It links to the Program page, the
 * week in full.
 */
function WeekStrip({
  streak,
  today,
}: {
  readonly streak: number | undefined
  readonly today: string | undefined
}) {
  const program = useProgram()
  const schedule = useSchedule()
  const workouts = useRecentWorkouts(200)
  if (today === undefined) return null
  const monday = mondayOf(today)
  const filed = (workouts.data ?? [])
    .filter((log) => log.status === 'completed')
    .map((log) => ({ date: log.date, title: log.title }))
  /* Nothing is owed before the first session ever filed, or a new install opens on misses. */
  const week =
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
        ).weeks.find((one) => one.monday === monday)

  return (
    <div className="mt-2.5 flex items-center justify-between gap-3">
      <Link
        viewTransition
        to="/program"
        aria-label="The week, on the Program page"
        className="flex gap-1.5"
      >
        {Array.from({ length: 7 }, (_, at) => {
          const on = shiftDay(monday, at)
          const state = week?.days.find((one) => one.on === on)?.state
          return (
            <span
              key={on}
              aria-hidden
              className={cn(
                'flex size-8 items-center justify-center rounded-[0.625rem] text-xs font-semibold',
                state === 'done'
                  ? 'bg-accent-500/25 text-accent-200'
                  : state === 'missed'
                    ? 'text-warn-500 bg-ink-900'
                    : state === undefined
                      ? 'bg-ink-900 text-ink-600'
                      : 'bg-ink-850 text-ink-500',
                on === today && 'ring-accent-400 text-ink-50 ring-1 ring-inset',
              )}
            >
              {WEEKDAY_LABELS[parseDay(on).getUTCDay()]}
            </span>
          )
        })}
      </Link>
      {streak !== undefined && streak > 0 && (
        <p className="text-ink-500 shrink-0 text-right text-[0.8125rem] leading-tight">
          <span className="font-display text-ink-50 text-lg font-semibold">{streak}</span> week
          <br />
          streak
        </p>
      )}
    </div>
  )
}

/**
 * Today's bar on each lift, heaviest news first in size: the session's lead
 * lift is drawn larger. Warm-ups are not listed, because they are the same
 * every session and the player opens on them anyway.
 *
 * A row says what moved (`ripeLifts`): up a step, and in gold where that bar
 * is the heaviest the lift has carried. Gold means ahead of every time, the
 * accent means ahead of last time, the rule the records use.
 */
function SessionLifts({
  day,
  planned,
  units,
  drafted,
}: {
  readonly day: ProgramDay
  readonly planned: WorkoutLog | undefined
  readonly units: WeightUnit
  readonly drafted: boolean
}) {
  const exercises = useExercises()
  const history = useRecentWorkouts(500)
  const ripe =
    planned === undefined || history.data === undefined
      ? []
      : ripeLifts(planned, history.data, bestsByExercise(history.data))
  const slots = day.slots.filter((slot) => slot.role !== 'warmup')
  const nameOf = ({ exercise }: ProgramDay['slots'][number]) =>
    exercise.kind === 'specific'
      ? (exercises.data?.find((one) => one.id === exercise.exerciseId)?.name ?? 'Exercise')
      : exercise.label

  return (
    <ul className="border-ink-800 mt-2.5 border-t lg:mt-0">
      {drafted && (
        <li className="border-ink-800 text-accent-400 border-b py-1 text-[0.8125rem]">
          Edited for this session
        </li>
      )}
      {slots.map((slot, at) => {
        const entry = planned?.entries.find((one) => one.slotId === slot.id)
        const moved =
          entry === undefined
            ? undefined
            : ripe.find(
                (one) => one.exerciseId === entry.exerciseId && one.variant === entry.variant,
              )
        const row = (
          <>
            <span className="flex min-w-0 flex-col">
              <span
                className={cn('truncate', at === 0 ? 'text-lg font-semibold' : 'text-[0.9375rem]')}
              >
                {nameOf(slot)}
              </span>
              {moved?.from !== undefined && (
                <span
                  className={cn(
                    'numeric text-[0.8125rem]',
                    moved.heaviest === true ? 'text-gold-400' : 'text-accent-400',
                  )}
                >
                  {moved.heaviest === true ? 'Heaviest yet, up ' : 'Up '}
                  {formatLoad(moved.load - moved.from, units)}
                </span>
              )}
            </span>
            <PlannedFigure slot={slot} entry={entry} lead={at === 0} units={units} />
          </>
        )
        const rowClass = cn(
          'flex items-center justify-between gap-3',
          at === 0 ? 'min-h-[3.75rem]' : 'min-h-[2.625rem]',
        )
        return (
          <li key={slot.id} className="border-ink-800 border-b">
            {slot.exercise.kind === 'specific' ? (
              <Link
                viewTransition
                to={`/exercise/${slot.exercise.exerciseId}`}
                className={rowClass}
              >
                {row}
              </Link>
            ) : (
              <div className={rowClass}>{row}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** "210 × 3" where the plan holds a bar, and the rule where it does not. */
function PlannedFigure({
  slot,
  entry,
  lead,
  units,
}: {
  readonly slot: ProgramDay['slots'][number]
  readonly entry: WorkoutLog['entries'][number] | undefined
  readonly lead: boolean
  readonly units: WeightUnit
}) {
  const exercises = useExercises()
  const set = entry?.sets.find((one) => !one.isWarmup)
  const rule = slot.sets.find((one) => one.isWarmup !== true) ?? slot.sets[0]
  const bodyweight =
    exercises.data?.find((one) => one.id === entry?.exerciseId)?.loadBasis === 'bodyweight'

  if (set?.plannedLoad === undefined) {
    if (rule === undefined) return null
    return <span className="text-ink-500 numeric shrink-0 text-sm">{describeReps(rule.reps)}</span>
  }
  const amount = bodyweight
    ? set.plannedLoad > 0
      ? `+${String(set.plannedLoad)}`
      : 'BW'
    : units === 'lb'
      ? String(set.plannedLoad)
      : formatLoad(set.plannedLoad, units)
  const reps = set.prescription.reps
  return (
    <span className="flex shrink-0 items-baseline">
      <span
        className={cn(
          'font-display font-semibold',
          lead ? 'text-[2.125rem] font-bold tracking-[-0.02em]' : 'text-lg',
        )}
      >
        {amount}
      </span>
      <span className="text-ink-500 ml-1 text-sm">
        {reps.kind === 'emom' || reps.kind === 'time'
          ? describeReps(reps)
          : `× ${String(set.plannedReps ?? '—')}`}
      </span>
    </span>
  )
}

// Opened from the grid button only, so it loads on that press.
const EverythingSheet = lazyNamed(
  () => import('@/features/navigation/EverythingSheet'),
  'EverythingSheet',
)
// Opened by Edit only, so it loads on that press.
const SessionDraftEditor = lazyNamed(
  () => import('@/features/train/SessionDraftEditor'),
  'SessionDraftEditor',
)
