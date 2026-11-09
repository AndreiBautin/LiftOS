import { scrollMotion } from '@/lib/motion'
import type { NiggleRegion } from '@/domain/logging/niggles'
import {
  ArrowLeftRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronRight,
  History,
  Lightbulb,
  Link2,
  ListOrdered,
  Plus,
  Timer,
  TrendingDown,
  Unlink2,
  XCircle,
} from 'lucide-react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { SwipePager } from './SwipePager'
import { SessionTools, type SessionTool } from './SessionTools'
import type { Exercise } from '@/domain/exercises/exercise'
import { useHaptics } from '@/features/feel/haptics'
import { RollingNumber } from '@/components/shared/RollingNumber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'

import type { ExerciseId } from '@/domain/ids/ids'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { remainingSeconds } from '@/domain/logging/remaining'
import { isEntryComplete, remainingSets, totalWorkingSets } from '@/domain/logging/workout-log'
import { stepFor } from '@/domain/programs/progression'
import { isStalled, sessionsWithoutProgress } from '@/domain/programs/stall'
import type { RestPlan } from '@/domain/programs/rest'
import { describePrescription } from '@/domain/programs/prescription'
import { DAY_VERSIONS } from '@/domain/splits/rp-splits'
import { rackFor } from '@/domain/units/plates'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { Button, Card } from '@/components/shared/primitives'
import { useKeepAwake } from '@/shared/hooks/useKeepAwake'
import { cn } from '@/lib/cn'

import {
  useAddExercise,
  useReorderSession,
  useClearSet,
  useExerciseHistory,
  useLogSet,
  useSuperset,
  useSwapExercise,
} from './hooks'
import { canPair, partnerOf } from '@/domain/logging/superset'
import { SwapPanel } from './SwapPanel'
import { UndoToast } from './UndoToast'
import { KeyboardFlow, KeyHelp } from './KeyboardFlow'
import type { KeyAction } from './keyboard'
import { canLogPlanned, plannedResult } from './planned'
import { LadderStrip } from './LadderStrip'
import { BarStrip } from './BarStrip'
import { LoggedLine } from './LoggedLine'
import { RestTimer } from './RestTimer'
import { SetStage } from './SetStage'
import { ExercisePeek } from './ExercisePeek'
import { AddExercisePanel } from './AddExercisePanel'
import { EmomTimer } from './EmomTimer'
import { SetClock } from './SetClock'
import { ReorderPanel } from './ReorderPanel'
import { primeRestSounds } from './rest-sounds'
import { SessionMap } from './SessionMap'
import { SetRow } from './SetRow'
import { WarmupBlock } from './WarmupBlock'
import { splitDayLabel } from './useNextSession'
import { formatTime } from '@/lib/format-date'
import {
  barForNext,
  firstIncompleteIndex,
  loadToShow,
  nextStep,
  nextUp,
  restFor,
  restWorkOf,
  runStart,
  warmupRun,
} from './player-steps'

/**
 * Working through a session, one set at a time.
 *
 * **The first screen is the set.** One exercise, its next set as large as a
 * phone allows, and the button that logs it on the floor of the screen under
 * the thumb. What a set rarely needs is one press away rather than in the way:
 * the bar and the warm-up in a strip that opens a sheet (`BarStrip`), the
 * occasional tools behind the ⋯, and every set of the exercise a scroll below.
 * It replaced a stack that put the bar, the ramp, the ladder and a tempo picker
 * above the set; on a phone the first row to log sat at 656 of 812 pixels.
 *
 * **Everything that edits opens a sheet**, because the page under the dock is
 * off screen: an editor or a swap opened in place would open out of sight.
 */

interface Props {
  readonly workout: WorkoutLog
  readonly exercises: readonly Exercise[]
  readonly units: WeightUnit
  /** Whether a rest timer starts after a working set. */
  readonly restEnabled: boolean
  readonly keepAwake: boolean
  readonly onFinish: () => void
  readonly onAbandon: () => void
}

/** A sheet of the player's occasional tools; one at a time. */
type Sheet = 'add' | 'reorder' | 'swap' | 'clock' | 'exercises' | 'abandon'

export function SessionPlayer({
  workout,
  exercises,
  units,
  restEnabled,
  keepAwake,
  onFinish,
  onAbandon,
}: Props) {
  const [index, setIndex] = useState(() => runStart(workout, firstIncompleteIndex(workout)))
  const { settings: playerSettings } = useSettings()
  const haptic = useHaptics()
  const [openSet, setOpenSet] = useState<number | undefined>(undefined)
  const [rest, setRest] = useState<
    | {
        readonly startedAt: number
        readonly plan: RestPlan
        readonly logged: {
          readonly exerciseId: ExerciseId
          readonly setIndex: number
          readonly variant: string | undefined
          readonly load: number | undefined
          readonly reps: number | undefined
        }
      }
    | undefined
  >(undefined)
  const [showKeys, setShowKeys] = useState(false)
  /** The last one-tap log or skip, offered back for a few seconds. */
  const [undo, setUndo] = useState<
    | {
        readonly entryIndex: number
        readonly setIndex: number
        readonly label: string
        readonly stamp: number
      }
    | undefined
  >(undefined)
  const dismissUndo = useCallback(() => {
    setUndo(undefined)
  }, [])

  const logSet = useLogSet(workout.id)
  const { clock } = useServices()
  const swap = useSwapExercise(workout.id)
  const superset = useSuperset(workout.id)
  /* Open per exercise, like the swap: paging on closes it. See `ExercisePeek`. */
  const [peekAt, setPeekAt] = useState<number | undefined>(undefined)
  const closePeek = useCallback(() => {
    setPeekAt(undefined)
  }, [])
  const [sheet, setSheet] = useState<Sheet | undefined>(undefined)
  /* Stable: a sheet refocuses itself whenever its close handler changes. */
  const closeSheet = useCallback(() => {
    setSheet(undefined)
  }, [])
  const closeEditor = useCallback(() => {
    setOpenSet(undefined)
  }, [])
  const holdTimer = useRef<number | undefined>(undefined)
  const clearSet = useClearSet(workout.id)
  const addOne = useAddExercise(workout.id)
  const reorder = useReorderSession(workout.id)

  useKeepAwake(keepAwake)

  const entry = workout.entries[index]
  const nameOf = (id: ExerciseId): string =>
    exercises.find((exercise) => exercise.id === id)?.name ?? id

  const outstanding = remainingSets(workout)
  const loggedSets = totalWorkingSets(workout)
  /*
   * **Nothing performed is nothing to file.** Finishing a session with no
   * set done — warm-ups included — wrote a blank record into the history
   * (0 sets, the minutes it sat open), and on an open session it was the
   * only way out. It discards instead, through the abandon path, which
   * deletes a session with nothing logged.
   */
  const anythingDone = workout.entries.some((one) =>
    one.sets.some((set) => set.outcome === 'completed'),
  )

  if (entry === undefined) {
    return (
      <Card>
        {/*
          **An open session starts empty and is built here**: the first
          exercise is chosen from the library and the player turns to it.
          It used to say "add some from the program" with no way to.
        */}
        <p className="text-ink-100 font-medium">{workout.title}</p>
        <p className="text-ink-500 mt-1 text-sm">Nothing in it yet — pick the first exercise.</p>
        <AddExercisePanel
          library={exercises}
          inSession={new Set()}
          busy={addOne.isPending}
          startOpen
          heading="The first exercise"
          onAdd={(exercise) => {
            addOne.mutate({ afterIndex: -1, exerciseId: exercise.id })
          }}
        />
        <Button variant="ghost" full className="mt-3" onClick={onAbandon}>
          <XCircle size={16} aria-hidden />
          Discard this session
        </Button>
      </Card>
    )
  }

  const totalSets = workout.entries.reduce((sum, candidate) => sum + candidate.sets.length, 0)
  const settled = totalSets - outstanding
  /*
   * A run of warm-up rows is one step: one card, one pill, and Next goes
   * past all of it. See `WarmupBlock`.
   */
  const warmup = warmupRun(workout, index)
  const stepAfter = nextStep(workout, index)
  const stepEnd = stepAfter - 1
  const next = workout.entries[stepAfter]
  const first = entry.sets[0]
  const stepComplete =
    warmup === undefined
      ? isEntryComplete(entry)
      : warmup.every((at) => {
          const one = workout.entries[at]
          return one === undefined || isEntryComplete(one)
        })

  const go = (to: number) => {
    setIndex(runStart(workout, Math.max(0, Math.min(workout.entries.length - 1, to))))
    setOpenSet(undefined)
    window.scrollTo({ top: 0, behavior: scrollMotion() })
  }

  const exerciseHere = exercises.find((one) => one.id === entry.exerciseId)
  const bodyweightHere = exerciseHere?.loadBasis === 'bodyweight'
  const equipmentHere = exerciseHere?.equipment
  // The bar the loads go on, so the editor can offer loads the plates make.
  const barHere =
    equipmentHere === 'barbell' ? 'barbell' : equipmentHere === 'ez-bar' ? 'ez-bar' : undefined

  /** Turns to an entry without scrolling: a superset alternates in place. */
  const showEntry = (to: number) => {
    setIndex(to)
    setOpenSet(undefined)
  }

  /** Logs a set of this exercise: the dock, a row, its swipe and the keyboard. */
  const logAt = (
    setIndex: number,
    result: {
      load?: number | undefined
      reps?: number | undefined
      notes?: string | undefined
      niggle?: NiggleRegion | null
    },
  ) => {
    // Closed and resting on the tap, not on the save: the row is already
    // green (see `useLogSet`).
    setOpenSet(undefined)
    haptic('logged')
    const set = entry.sets[setIndex]
    if (set?.outcome === 'pending' && !set.isWarmup) {
      setUndo({
        entryIndex: index,
        setIndex,
        label: `Logged ${result.load === undefined ? '' : `${formatLoad(result.load, units)} × `}${String(result.reps ?? '—')}`,
        stamp: clock.now().getTime(),
      })
    }
    /*
     * **A superset goes straight to its partner.** After the first half of
     * a pair, the next set is the other exercise and there is no rest;
     * after the second, the full rest runs and the pair begins again.
     */
    const partner = partnerOf(workout, index)
    const partnerPending =
      partner !== undefined &&
      workout.entries[partner]?.sets.some((one) => one.outcome === 'pending' && !one.isWarmup) ===
        true
    const straightOn = partnerPending && partner > index
    // A warm-up does not earn a rest timer.
    if (set !== undefined && !set.isWarmup && restEnabled && !straightOn) {
      const plan = restFor(workout, index, setIndex, result.reps, exercises)
      // Inside the tap: iOS only wakes audio during a gesture.
      if (playerSettings.restSounds) primeRestSounds()
      setRest(
        plan.seconds > 0
          ? {
              startedAt: clock.now().getTime(),
              plan,
              logged: {
                exerciseId: entry.exerciseId,
                setIndex,
                variant: entry.variant,
                load: result.load,
                reps: result.reps,
              },
            }
          : undefined,
      )
    }
    if (partnerPending) showEntry(partner)
    // Spread conditionally rather than passing `undefined` through: an
    // absent number and an explicitly unknown one differ to the log.
    logSet.mutate({
      entryIndex: index,
      setIndex,
      result: {
        ...(result.load !== undefined ? { load: result.load } : {}),
        ...(result.reps !== undefined ? { reps: result.reps } : {}),
        ...(result.notes !== undefined ? { notes: result.notes } : {}),
        ...(result.niggle !== undefined ? { niggle: result.niggle } : {}),
        outcome: 'completed',
      },
    })
  }

  const skipAt = (setIndex: number) => {
    setOpenSet(undefined)
    haptic('skipped')
    setUndo({ entryIndex: index, setIndex, label: 'Skipped', stamp: clock.now().getTime() })
    logSet.mutate({ entryIndex: index, setIndex, result: { outcome: 'skipped' } })
  }

  const finish = () => {
    if (!anythingDone) {
      onAbandon()
      return
    }
    if (outstanding === 0) haptic('finished')
    onFinish()
  }

  /*
   * **The keyboard drives the same actions the rows do**, on the next
   * pending set of the exercise on screen. Logging a set the plan cannot
   * fill (no load to confirm) opens it instead, the rule the row's own
   * check follows (`canLogPlanned`).
   */
  const nextOpen = entry.sets.findIndex((set) => set.outcome === 'pending')
  const pending = warmup === undefined ? entry.sets[nextOpen] : undefined
  const onKey = (action: KeyAction) => {
    const set = entry.sets[nextOpen]
    switch (action) {
      case 'log':
        if (set === undefined || warmup !== undefined) return
        if (canLogPlanned(set)) logAt(nextOpen, plannedResult(set, bodyweightHere))
        else setOpenSet(nextOpen)
        return
      case 'skip':
        if (set !== undefined && warmup === undefined && !set.isWarmup) skipAt(nextOpen)
        return
      case 'edit':
        if (set !== undefined && warmup === undefined) setOpenSet(nextOpen)
        return
      case 'next':
        go(stepAfter)
        return
      case 'previous':
        go(index - 1)
        return
      case 'close':
        if (showKeys) setShowKeys(false)
        else if (openSet !== undefined) setOpenSet(undefined)
        else setRest(undefined)
        return
      case 'help':
        setShowKeys((shown) => !shown)
        return
    }
  }

  /* A tool is listed only where it applies, so the tray never holds a dead button. */
  const tools: SessionTool[] = [
    {
      id: 'exercises',
      label: 'All exercises',
      icon: ListOrdered,
      run: () => {
        setSheet('exercises')
      },
    },
    ...(warmup === undefined && entry.sets.some((set) => set.outcome === 'pending')
      ? [
          {
            id: 'swap',
            label: 'Swap',
            icon: ArrowLeftRight,
            run: () => {
              setSheet('swap')
            },
          },
        ]
      : []),
    ...(warmup === undefined &&
    partnerOf(workout, index) === undefined &&
    canPair(entry, workout.entries[index + 1]) &&
    !superset.isPending
      ? [
          {
            id: 'pair',
            label: `Pair with ${nameOf(workout.entries[index + 1]?.exerciseId ?? entry.exerciseId)}`,
            icon: Link2,
            run: () => {
              superset.mutate({ entryIndex: index, pair: true })
            },
          },
        ]
      : []),
    ...(warmup === undefined
      ? [
          {
            id: 'past',
            label: 'Recent sessions',
            icon: History,
            run: () => {
              setPeekAt(index)
            },
          },
          ...(first?.prescription.reps.kind === 'emom'
            ? []
            : [
                {
                  id: 'clock',
                  label: 'Time the set',
                  icon: Timer,
                  run: () => {
                    setSheet('clock')
                  },
                },
              ]),
        ]
      : []),
    {
      id: 'add',
      label: 'Add an exercise',
      icon: Plus,
      run: () => {
        setSheet('add')
      },
    },
    {
      id: 'reorder',
      label: 'Change the order',
      icon: ArrowUpDown,
      run: () => {
        setSheet('reorder')
      },
    },
    ...(anythingDone && outstanding > 0
      ? [
          {
            id: 'finish',
            label: `Finish early · ${String(outstanding)} sets left`,
            icon: CheckCircle2,
            run: finish,
          },
        ]
      : []),
    anythingDone
      ? {
          id: 'abandon',
          label: 'Abandon session',
          icon: XCircle,
          run: () => {
            setSheet('abandon')
          },
        }
      : {
          id: 'discard',
          label: 'Discard session',
          icon: XCircle,
          run: onAbandon,
        },
  ]

  /*
   * The step's main button: the set while there is one, then the way on.
   * Only ever one lit control on the floor of the screen.
   */
  const dockClass = 'font-display h-20 rounded-[1.375rem] text-[1.625rem] font-semibold'
  const figures = (
    <SessionFigures
      workout={workout}
      exercises={exercises}
      settled={settled}
      totalSets={totalSets}
    />
  )

  const rowFor = (setIndex: number, isOpen: boolean) => {
    const set = entry.sets[setIndex]
    if (set === undefined) return null
    return (
      <SetRow
        key={setIndex}
        set={set}
        index={setIndex}
        entryIndex={index}
        exerciseId={entry.exerciseId}
        workoutId={workout.id}
        variant={entry.variant}
        earlier={entry.sets
          .slice(0, setIndex)
          .filter((one) => !one.isWarmup && one.outcome === 'completed')
          .map((one) => ({ load: one.actualLoad, reps: one.actualReps }))}
        units={units}
        bodyweight={bodyweightHere}
        bar={barHere}
        isOpen={isOpen}
        onOpen={() => {
          setOpenSet(setIndex)
        }}
        onLog={(result) => {
          logAt(setIndex, result)
        }}
        onSkip={() => {
          skipAt(setIndex)
        }}
        onClear={() => {
          clearSet.mutate(
            { entryIndex: index, setIndex },
            {
              onSuccess: () => {
                setOpenSet(undefined)
              },
            },
          )
        }}
      />
    )
  }

  const onward =
    next !== undefined ? (
      <Button
        variant={stepComplete ? 'primary' : 'outline'}
        full
        className={dockClass}
        onClick={() => {
          go(stepAfter)
        }}
        aria-label={`Next exercise: ${nameOf(next.exerciseId)}`}
      >
        <span className="min-w-0 truncate">{nameOf(next.exerciseId)}</span>
        <ChevronRight size={24} className="shrink-0" aria-hidden />
      </Button>
    ) : (
      <Button
        variant={outstanding === 0 ? 'primary' : 'outline'}
        full
        className={dockClass}
        onClick={finish}
      >
        <CheckCircle2 size={24} aria-hidden />
        {!anythingDone ? 'Discard' : outstanding === 0 ? 'Finish session' : 'Finish early'}
      </Button>
    )

  return (
    <div className="session-player mx-auto max-w-2xl lg:max-w-5xl">
      {/*
        **Pinned to the very top, with its content padded below the status
        bar.** An installed app on a phone draws under the clock, so
        `top: 0` alone parked the bar's title row behind it. Pulling the bar
        up over the page's own safe-area padding and padding its content
        back down means the background fills the strip behind the status bar
        too, so the sets never scroll through it. A style rather than a
        bracket class, because `env()` inside one is fragile across builds.
      */}
      <div
        className="bg-ink-950 sticky top-0 z-20 -mx-4 px-4 pb-2.5 sm:mx-0"
        style={{
          marginTop: 'calc(-1rem - var(--safe-top))',
          paddingTop: 'calc(0.875rem + var(--safe-top))',
          // Morphs into the report's hero on finish; see `HomePage`.
          viewTransitionName: 'session-hero',
        }}
      >
        {figures}
        <StepTrack workout={workout} current={index} />
      </div>

      {/*
        A set shows as logged the moment it is tapped (see `useLogSet`), so
        a save that fails has already been seen to succeed. It is put back
        and said here, plainly, rather than leaving a green row that is
        not stored.
      */}
      {logSet.isError && (
        <div
          role="alert"
          className="border-bad-500/40 bg-bad-500/10 mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
        >
          <span className="text-ink-100">That set did not save, so it has been put back.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logSet.reset()
            }}
          >
            OK
          </Button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <div className="first-screen flex flex-col">
            {warmup !== undefined ? (
              <>
                <div className="-mb-3 flex justify-end pt-1">
                  <SessionTools tools={tools} />
                </div>
                <WarmupBlock workout={workout} indices={warmup} nameOf={nameOf} />
              </>
            ) : (
              <SwipePager
                onNext={() => {
                  go(stepAfter)
                }}
                onPrevious={() => {
                  go(index - 1)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1
                      id="exercise-name"
                      className="text-ink-50 text-[2rem] leading-tight font-bold"
                    >
                      {/*
                        **The name opens the exercise's recent past**, on a
                        tap or a hold — a hold is what a phone teaches for
                        "show me more", and a tap is what a mouse can do.
                      */}
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`${nameOf(entry.exerciseId)} — show recent sessions`}
                        className="text-left select-none [-webkit-touch-callout:none]"
                        onPointerDown={() => {
                          window.clearTimeout(holdTimer.current)
                          holdTimer.current = window.setTimeout(() => {
                            haptic('press')
                            setPeekAt(index)
                          }, 450)
                        }}
                        onPointerUp={() => {
                          window.clearTimeout(holdTimer.current)
                        }}
                        onPointerLeave={() => {
                          window.clearTimeout(holdTimer.current)
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault()
                        }}
                        onClick={() => {
                          setPeekAt(index)
                        }}
                      >
                        {nameOf(entry.exerciseId)}
                      </button>
                    </h1>
                    <p className="text-ink-500 numeric mt-1 text-[0.9375rem]">
                      {setPosition(entry.sets, nextOpen)}
                    </p>
                  </div>
                  <div className="-mr-2 shrink-0">
                    <SessionTools tools={tools} />
                  </div>
                </div>
                <SupersetLine
                  workout={workout}
                  index={index}
                  nameOf={nameOf}
                  busy={superset.isPending}
                  onUnpair={() => {
                    superset.mutate({ entryIndex: index, pair: false })
                  }}
                />
                {/* The lifter's own cue, from the exercise page. */}
                {playerSettings.exerciseCues?.[entry.exerciseId] !== undefined && (
                  <p className="text-ink-300 mt-1 text-sm italic">
                    “{playerSettings.exerciseCues[entry.exerciseId]}”
                  </p>
                )}
                {entry.substitutedFor !== undefined && (
                  <p className="text-ink-500 mt-1 text-sm">
                    In place of {nameOf(entry.substitutedFor)}
                  </p>
                )}
                {swap.isError && (
                  <p role="alert" className="text-warn-500 mt-2 text-sm">
                    Could not swap: {swap.error.message}
                  </p>
                )}

                {pending === undefined ? (
                  <div className="flex-1 space-y-2 py-4">
                    {entry.sets.map((_, setIndex) => rowFor(setIndex, false))}
                  </div>
                ) : pending.prescription.reps.kind === 'emom' ? (
                  <div className="flex-1 py-4">
                    {/* An EMOM has its own clock, which logs the set as planned at the end. */}
                    <EmomTimer
                      key={`emom-${String(index)}`}
                      set={pending}
                      units={units}
                      onFinish={() => {
                        logAt(nextOpen, plannedResult(pending, bodyweightHere))
                      }}
                    />
                  </div>
                ) : (
                  <SetStage
                    key={`${String(index)}-${String(nextOpen)}`}
                    set={pending}
                    setIndex={nextOpen}
                    exerciseId={entry.exerciseId}
                    workoutId={workout.id}
                    variant={entry.variant}
                    bodyweight={bodyweightHere}
                    units={units}
                  />
                )}

                {/*
                  Keyed by the exercise: the ramp's ticks are for this bar, and
                  two siblings must never share a key. That shipped once and
                  left the last exercise's bar behind on every page turn.
                */}
                <BarStrip
                  key={`bar-${String(index)}`}
                  equipment={equipmentHere}
                  load={loadToShow(entry.sets)}
                  units={units}
                  /*
                   * Every barbell compound gets a ramp, not only the day's
                   * competition lift: a Pendlay row or a front squat is a
                   * heavy bar taken cold otherwise. Isolation work at a light
                   * load is still its own warm-up.
                   */
                  ramp={entry.role === 'strength' || exerciseHere?.isCompound === true}
                />
                <LadderFor entry={entry} exercises={exercises} units={units} />
              </SwipePager>
            )}

            <div
              className="bg-ink-950 sticky bottom-0 z-10 -mx-4 mt-1 px-4 pt-2 sm:mx-0 sm:px-0"
              style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
            >
              {pending === undefined ? (
                onward
              ) : (
                <>
                  <Button
                    variant="primary"
                    full
                    className={dockClass}
                    aria-label={
                      canLogPlanned(pending)
                        ? `Log set ${String(nextOpen + 1)} as planned`
                        : `Enter set ${String(nextOpen + 1)}`
                    }
                    onClick={() => {
                      if (canLogPlanned(pending)) {
                        logAt(nextOpen, plannedResult(pending, bodyweightHere))
                      } else {
                        setOpenSet(nextOpen)
                      }
                    }}
                  >
                    {canLogPlanned(pending) ? (
                      <>
                        <Check size={26} aria-hidden />
                        <span className="truncate">
                          Log {plannedText(pending, bodyweightHere, units)}
                        </span>
                      </>
                    ) : (
                      'Enter the set'
                    )}
                  </Button>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[0.9375rem]">
                    <span className="flex gap-5">
                      <button
                        type="button"
                        className="tap-target text-ink-50 font-medium"
                        onClick={() => {
                          setOpenSet(nextOpen)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="tap-target text-ink-500 font-medium"
                        onClick={() => {
                          skipAt(nextOpen)
                        }}
                      >
                        Skip
                      </button>
                    </span>
                    {next !== undefined && (
                      <button
                        type="button"
                        className="tap-target text-ink-500 flex min-w-0 items-center gap-1"
                        aria-label={`Next exercise: ${nameOf(next.exerciseId)}`}
                        onClick={() => {
                          go(stepAfter)
                        }}
                      >
                        <span className="truncate">Next: {nameOf(next.exerciseId)}</span>
                        <ChevronRight size={16} className="shrink-0" aria-hidden />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Scrolled to rather than shown: every set of the exercise, to look at or fix. */}
          {warmup === undefined && pending !== undefined && (
            <section className="mt-6" aria-label="Every set of this exercise">
              {first !== undefined && (
                <p className="text-ink-500 numeric mb-2 text-sm">
                  {entry.sets.length} {entry.sets.length === 1 ? 'set' : 'sets'} ·{' '}
                  {describePrescription(first.prescription)}
                </p>
              )}
              <div className="space-y-2">
                {entry.sets.map((_, setIndex) => rowFor(setIndex, false))}
              </div>
              {entry.notes !== undefined && (
                <p className="text-ink-300 mt-4 flex gap-2 text-sm">
                  <Lightbulb size={16} className="text-ink-500 mt-0.5 shrink-0" aria-hidden />
                  <span>{entry.notes}</span>
                </p>
              )}
            </section>
          )}
        </div>
        <SessionMap
          workout={workout}
          current={index}
          runs={(at) => warmupRun(workout, at)}
          nameOf={nameOf}
          onGo={go}
        />
      </div>

      <KeyboardFlow onAction={onKey} />
      {showKeys && (
        <KeyHelp
          onClose={() => {
            setShowKeys(false)
          }}
        />
      )}

      {undo !== undefined && rest === undefined && (
        <UndoToast
          label={undo.label}
          stamp={undo.stamp}
          onDone={dismissUndo}
          onUndo={() => {
            clearSet.mutate({ entryIndex: undo.entryIndex, setIndex: undo.setIndex })
            setUndo(undefined)
          }}
        />
      )}

      {peekAt === index && warmup === undefined && (
        <ExercisePeek
          exerciseId={entry.exerciseId}
          name={nameOf(entry.exerciseId)}
          variant={entry.variant}
          bodyweight={bodyweightHere}
          currentWorkoutId={workout.id}
          onClose={closePeek}
        />
      )}

      {openSet !== undefined && warmup === undefined && (
        <BottomSheet
          label={`Edit set ${String(openSet + 1)}`}
          title={nameOf(entry.exerciseId)}
          onClose={closeEditor}
        >
          <div className="mt-2">{rowFor(openSet, true)}</div>
        </BottomSheet>
      )}

      {sheet === 'exercises' && (
        <BottomSheet label="All exercises" title="All exercises" onClose={closeSheet}>
          <SessionMap
            inSheet
            workout={workout}
            current={index}
            runs={(at) => warmupRun(workout, at)}
            nameOf={nameOf}
            onGo={(to) => {
              setSheet(undefined)
              go(to)
            }}
          />
        </BottomSheet>
      )}

      {sheet === 'swap' && warmup === undefined && (
        <BottomSheet
          label="Swap this exercise"
          title={`Swap ${nameOf(entry.exerciseId)}`}
          onClose={closeSheet}
        >
          <SwapPanel
            entry={entry}
            current={exerciseHere}
            units={units}
            busy={swap.isPending}
            onPick={(exercise) => {
              swap.mutate(
                { entryIndex: index, exerciseId: exercise.id },
                {
                  onSuccess: (updated) => {
                    setSheet(undefined)
                    setOpenSet(undefined)
                    /*
                     * Started, the rest moved to a new entry just after;
                     * swapped back, it rejoined the one before. Follow it.
                     */
                    const moved = updated.entries.length - workout.entries.length
                    if (moved !== 0) setIndex(index + moved)
                  },
                },
              )
            }}
          />
        </BottomSheet>
      )}

      {sheet === 'clock' && (
        <BottomSheet label="Time the set" title="Time the set" onClose={closeSheet}>
          <SetClock key={`clock-${String(index)}`} />
        </BottomSheet>
      )}

      {sheet === 'add' && (
        <BottomSheet label="Add an exercise" title="Add an exercise" onClose={closeSheet}>
          <AddExercisePanel
            onClose={closeSheet}
            library={exercises}
            inSession={new Set(workout.entries.map((one) => one.exerciseId))}
            busy={addOne.isPending}
            onAdd={(exercise) => {
              addOne.mutate(
                { afterIndex: stepEnd, exerciseId: exercise.id },
                {
                  // Straight to it; `go` would clamp against the session before the add.
                  onSuccess: () => {
                    setSheet(undefined)
                    showEntry(stepAfter)
                    window.scrollTo({ top: 0, behavior: scrollMotion() })
                  },
                },
              )
            }}
          />
        </BottomSheet>
      )}

      {sheet === 'reorder' && (
        <BottomSheet label="Change the order" title="Change the order" onClose={closeSheet}>
          <ReorderPanel
            onClose={closeSheet}
            workout={workout}
            current={index}
            nameOf={nameOf}
            busy={reorder.isPending}
            onMove={(at, by) => {
              reorder.mutate(
                { at, by },
                {
                  // The exercise on screen stays on screen, wherever it moved.
                  onSuccess: () => {
                    if (at === index) showEntry(at + by)
                    else if (at + by === index) showEntry(at)
                  },
                },
              )
            }}
          />
        </BottomSheet>
      )}

      {/*
        The way out of a session opened by mistake. The wording changes with
        what is at stake: with sets logged, abandoning keeps them.
      */}
      {sheet === 'abandon' && (
        <BottomSheet
          label="Abandon this session"
          title={`Abandon, keeping ${String(loggedSets)} logged set${loggedSets === 1 ? '' : 's'}?`}
          onClose={closeSheet}
        >
          <p className="text-ink-300 mt-1 text-sm">
            The sets you logged are kept and still count toward your volume. The program stays on
            this day, so you can run it again or skip it.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" className="flex-1" onClick={onAbandon}>
              Abandon
            </Button>
            <Button variant="outline" className="flex-1" onClick={closeSheet}>
              Keep training
            </Button>
          </div>
        </BottomSheet>
      )}

      {rest !== undefined && (
        <RestTimer
          sounds={playerSettings.restSounds}
          seconds={rest.plan.seconds}
          reason={rest.plan.reason}
          startedAt={rest.startedAt}
          header={figures}
          logged={
            <LoggedLine
              {...rest.logged}
              workoutId={workout.id}
              units={units}
              onUndo={
                undo === undefined
                  ? undefined
                  : () => {
                      clearSet.mutate({ entryIndex: undo.entryIndex, setIndex: undo.setIndex })
                      setRest(undefined)
                      setUndo(undefined)
                    }
              }
            />
          }
          next={(() => {
            const up = nextUp(workout, index, nameOf, exercises, units)
            return up === undefined
              ? undefined
              : {
                  ...up,
                  bar: barForNext(
                    workout,
                    index,
                    exercises,
                    units,
                    rackFor(playerSettings.plates, units, playerSettings.platePairs),
                    { load: rest.logged.load, exerciseId: rest.logged.exerciseId },
                  ),
                }
          })()}
          onDismiss={() => {
            setRest(undefined)
            // Undo was offered on this screen; once it is gone, so is the offer.
            setUndo(undefined)
            // The rest that ended an exercise leads into the next one.
            if (stepComplete && next !== undefined) go(stepAfter)
          }}
        />
      )}
    </div>
  )
}

/** "Set 1 of 2", counted in working sets; "All 2 sets done" once none is left. */
function setPosition(sets: WorkoutLog['entries'][number]['sets'], at: number): string {
  const working = sets.filter((set) => !set.isWarmup)
  const set = sets[at]
  if (set === undefined) {
    return working.length === 1 ? 'Done' : `All ${String(working.length)} sets done`
  }
  return `Set ${String(working.indexOf(set) + 1)} of ${String(working.length)}`
}

/** "210 × 3", the way the log button says it. */
function plannedText(
  set: WorkoutLog['entries'][number]['sets'][number],
  bodyweight: boolean,
  units: WeightUnit,
): string {
  const load =
    set.plannedLoad === undefined
      ? undefined
      : bodyweight
        ? set.plannedLoad > 0
          ? `BW + ${String(set.plannedLoad)}`
          : 'BW'
        : units === 'lb'
          ? String(set.plannedLoad)
          : formatLoad(set.plannedLoad, units)
  if (load === undefined) return describePrescription(set.prescription)
  return set.plannedReps === undefined ? load : `${load} × ${String(set.plannedReps)}`
}

/**
 * A segment per step of the session: done, current, to come. A session is run
 * in exercises, so that is what the strip counts; the sets are in the figures.
 */
function StepTrack({
  workout,
  current,
}: {
  readonly workout: WorkoutLog
  readonly current: number
}) {
  const steps = workout.entries.flatMap((_, at) => {
    const run = warmupRun(workout, at)
    if (run !== undefined && run[0] !== at) return []
    const members = (run ?? [at]).flatMap((one) => workout.entries[one] ?? [])
    return [
      {
        at,
        active: run === undefined ? current === at : run.includes(current),
        done: members.every((one) => isEntryComplete(one)),
      },
    ]
  })
  return (
    <div className="mt-2 flex h-1 gap-1" aria-hidden>
      {steps.map((step) => (
        <span
          key={step.at}
          className={cn(
            'h-full flex-1 rounded-full transition-colors duration-300',
            step.active ? 'bg-accent-400' : step.done ? 'bg-accent-600/60' : 'bg-ink-800',
          )}
        />
      ))}
    </div>
  )
}

/** The session's name and where it stands: the bar's top line, and the rest screen's. */
function SessionFigures({
  workout,
  exercises,
  settled,
  totalSets,
}: {
  readonly workout: WorkoutLog
  readonly exercises: readonly Exercise[]
  readonly settled: number
  readonly totalSets: number
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-ink-500 min-w-0 truncate text-sm">{splitDayLabel(workout.title).name}</p>
      <p className="numeric text-ink-500 flex shrink-0 items-center gap-1.5 text-sm">
        <span>
          <RollingNumber value={settled} className="text-ink-50 font-semibold" /> of {totalSets}{' '}
          sets
        </span>
        <span aria-hidden>·</span>
        <Elapsed startedAt={workout.startedAt} />
        <FinishAt workout={workout} exercises={exercises} />
      </p>
    </div>
  )
}

/**
 * The progression ladder, for an exercise worked in a rep range — not a
 * timed block or a warm-up, where there is no top of a range to reach.
 */
function LadderFor({
  entry,
  exercises,
  units,
}: {
  readonly entry: WorkoutLog['entries'][number]
  readonly exercises: readonly Exercise[]
  readonly units: WeightUnit
}) {
  const reps = entry.sets.find((set) => !set.isWarmup)?.prescription.reps
  const exercise = exercises.find((one) => one.id === entry.exerciseId)
  if (reps?.kind !== 'range' || exercise === undefined) return null
  return (
    <>
      <LadderStrip
        sets={entry.sets}
        range={{ low: reps.low, high: reps.high }}
        step={stepFor(exercise)}
        units={units}
        bodyweight={exercise.loadBasis === 'bodyweight'}
      />
      <StallHint exerciseId={entry.exerciseId} variant={entry.variant} />
    </>
  )
}

/**
 * A stalled exercise, named where it is being done, with the way to its
 * options. The offer itself lives on the exercise page, beside the
 * history that justifies it; mid-set is no place to make that decision.
 */
function StallHint({
  exerciseId,
  variant,
}: {
  readonly exerciseId: WorkoutLog['entries'][number]['exerciseId']
  readonly variant: string | undefined
}) {
  const history = useExerciseHistory(exerciseId)
  const version = variant !== undefined && DAY_VERSIONS.includes(variant) ? variant : undefined
  const series = history.data?.find((one) => one.variant === version)
  if (series === undefined) return null
  const tops = series.sessions.map((session) => session.top)
  if (!isStalled(tops)) return null
  return (
    <Link
      viewTransition
      to={`/exercise/${exerciseId}`}
      className="text-warn-500 hover:text-warn-500/80 flex min-h-11 items-center gap-1.5 text-sm font-medium"
    >
      <TrendingDown size={14} aria-hidden />
      Stalled for {sessionsWithoutProgress(tops)} sessions — see options
      <ChevronRight size={14} aria-hidden />
    </Link>
  )
}

/**
 * How long the session has run, read from the clock port.
 *
 * Derived from `startedAt` on every tick rather than counted up, for the
 * reason the rest timer is: a phone locked between sets suspends the tab,
 * and a count would come back short.
 */
function Elapsed({ startedAt }: { readonly startedAt: string }) {
  const { clock } = useServices()
  const [now, setNow] = useState(() => clock.now().getTime())

  useEffect(() => {
    const tick = (): void => {
      setNow(clock.now().getTime())
    }
    const handle = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [clock])

  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const text =
    hours > 0
      ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
      : `${String(minutes)}:${String(seconds % 60).padStart(2, '0')}`

  return <span aria-label={`${text} elapsed`}>{text}</span>
}

/**
 * **When the session should end, at the plan's pace**, from the pending sets
 * and the rests the timer will give them (`remainingSeconds`). The question
 * between sets is often "will I be out by eight", and the session already
 * knows. Moves as the session does; gone once nothing is pending.
 */
function FinishAt({
  workout,
  exercises,
}: {
  readonly workout: WorkoutLog
  readonly exercises: readonly Exercise[]
}) {
  const { clock } = useServices()
  const [now, setNow] = useState(() => clock.now().getTime())

  useEffect(() => {
    const tick = (): void => {
      setNow(clock.now().getTime())
    }
    const handle = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [clock])

  const left = remainingSeconds(workout, (entry) => restWorkOf(entry, exercises))
  if (left <= 0) return null
  const at = formatTime(new Date(now + left * 1000), {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <>
      <span aria-hidden>·</span>
      <span aria-label={`Projected to finish at ${at}`}>{at}</span>
    </>
  )
}

/**
 * Says the exercise on screen is half of a superset, names the other half,
 * and offers to split them. Silent for an exercise run on its own.
 */
function SupersetLine({
  workout,
  index,
  nameOf,
  busy,
  onUnpair,
}: {
  readonly workout: WorkoutLog
  readonly index: number
  readonly nameOf: (id: ExerciseId) => string
  readonly busy: boolean
  readonly onUnpair: () => void
}) {
  const partner = partnerOf(workout, index)
  const other = partner === undefined ? undefined : workout.entries[partner]
  if (partner === undefined || other === undefined) return null
  return (
    <p className="text-accent-400 mt-1 flex items-center gap-2 text-sm">
      <Link2 size={14} aria-hidden />
      <span className="min-w-0 truncate">
        Superset {partner > index ? 'A1' : 'A2'} · with {nameOf(other.exerciseId)}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={onUnpair}
        className="text-ink-500 hover:text-ink-300 tap-target ml-auto flex shrink-0 items-center gap-1"
      >
        <Unlink2 size={12} aria-hidden />
        Unpair
      </button>
    </p>
  )
}
