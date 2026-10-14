import { Suspense, useState } from 'react'

import { lazyNamed } from '@/lib/lazy-named'
import { Skeleton } from '@/components/shared/Skeleton'

import { NoticeStrip } from './NoticeStrip'
import { arrangeCards } from '@/domain/settings/home-cards'
import { ArrangeCards } from './ArrangeCards'
import { InstallCard } from '@/features/pwa/InstallCard'
import { WhatsNew } from './WhatsNew'
import { DeloadSuggestion } from '@/features/train/DeloadSuggestion'
import { withViewTransition } from '@/app/view-transitions'
import type { WorkoutReport } from '@/application/use-cases/training/finish-workout'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { useSettings } from '@/app/context'
import { Masonry } from '@/components/shared/Masonry'
import {
  useAbandonWorkout,
  useActiveWorkout,
  useExercises,
  useFinishWorkout,
  useRecentWorkouts,
  useProgram,
  useSchedule,
} from '@/features/train/hooks'
import { NextSessionCard } from '@/features/train/NextSessionCard'
import { SessionReport } from '@/features/train/SessionReport'
import { WeekCard } from '@/features/train/WeekCard'

import { FirstRunSetup } from './FirstRunSetup'
import { HeroBanner } from './HeroBanner'
import { SampleNotice } from './SampleNotice'

/*
 * **Below the first two cards, every card loads on demand.** They were all
 * in the entry chunk, so the first paint waited on the forecast maths,
 * the body map and the training grid that sit a screen or more down. The
 * hero, the plan and the week stay eager because they are what a phone
 * shows first. The player is split too: it renders only while a session
 * is open. The service worker precaches every chunk, so offline is
 * unchanged.
 */
const AdherenceCard = lazyNamed(() => import('@/features/train/AdherenceCard'), 'AdherenceCard')
const ForecastCard = lazyNamed(() => import('@/features/train/ForecastCard'), 'ForecastCard')
const ThenNowCard = lazyNamed(() => import('@/features/train/ThenNowCard'), 'ThenNowCard')
const RipeCard = lazyNamed(() => import('@/features/train/RipeCard'), 'RipeCard')
const SavedSessionsCard = lazyNamed(
  () => import('@/features/templates/SavedSessionsCard'),
  'SavedSessionsCard',
)
const BalanceCard = lazyNamed(() => import('@/features/train/BalanceCard'), 'BalanceCard')
const BodyMapCard = lazyNamed(() => import('@/features/train/BodyMapCard'), 'BodyMapCard')
const TrainingTimesCard = lazyNamed(
  () => import('@/features/train/TrainingTimesCard'),
  'TrainingTimesCard',
)
const GoalsCard = lazyNamed(() => import('@/features/train/GoalsCard'), 'GoalsCard')
const TrainingHistory = lazyNamed(
  () => import('@/features/history/TrainingHistory'),
  'TrainingHistory',
)
const ActivityHeatmap = lazyNamed(
  () => import('@/features/train/ActivityHeatmap'),
  'ActivityHeatmap',
)
const LastWeekCard = lazyNamed(() => import('@/features/train/LastWeekCard'), 'LastWeekCard')
const SessionPlayer = lazyNamed(() => import('@/features/train/SessionPlayer'), 'SessionPlayer')
const StrengthStandards = lazyNamed(
  () => import('@/features/train/StrengthStandards'),
  'StrengthStandards',
)
const StrengthTrendCard = lazyNamed(
  () => import('@/features/train/StrengthTrendCard'),
  'StrengthTrendCard',
)

/**
 * The whole app, on one page.
 *
 * **One page and no navigation bar.** Asked for as _"lets just condense
 * this into one page without a navbar"_, once the app's tabs had become
 * three views of one workout log. The next session, strength, the trend,
 * the training grid and the history read top to bottom; Program and
 * Settings are the only other screens, each a link from here with a way
 * back.
 *
 * **It opens on the hero**, which names the next session and starts it.
 * It was a portrait and a level while the app was a game, then a bare
 * "LiftOS" over a gear — and in both the session you came to start sat
 * a card's height down. See `HeroBanner`.
 *
 * **The takeover is the rule that survived every arrangement.** An
 * unfinished workout is the only thing that matters until it is
 * finished, and burying it behind a dashboard is how half-logged
 * sessions get lost — so while one is open this page *is* the session
 * player, and after finishing it is the report until dismissed. Starting
 * a session therefore needs no navigation: the active-workout query
 * refetches and the page swaps itself.
 *
 * **The cards are balanced by measured height, not assigned to columns.**
 * `Masonry` takes as many ~360px columns as the width holds and drops
 * each card into the shortest one; on a phone it is a single stack in
 * this order. The history is one of the cards: it ran full width
 * underneath on the reasoning that a list reads better wide, and on a
 * monitor that made it a stack of empty stripes.
 */
export function HomePage() {
  const { settings } = useSettings()
  const activeWorkout = useActiveWorkout()
  /*
   * **The first paint waits for what changes the shape above the fold.**
   * The hero's session name, its description line and its medallion come
   * from the schedule and the library, and the notices above it read the
   * latest session; drawn before those, each arrived a beat later and
   * pushed everything under it down — the page's whole layout shift.
   * All of them are local reads that land within a few frames.
   */
  const latest = useRecentWorkouts(1)
  const program = useProgram()
  const schedule = useSchedule()
  const exercises = useExercises()
  const finishWorkout = useFinishWorkout()
  const abandonWorkout = useAbandonWorkout()

  const [report, setReport] = useState<WorkoutReport | undefined>(undefined)
  /*
   * **The session being finished stays on screen until its report does.**
   * Finishing refetches the active workout, which comes back empty before
   * the report is set — and in between this page built the whole
   * dashboard, sixteen cards and a forced layout, only to replace it with
   * the report a moment later. Holding the player over that gap is most of
   * what finishing cost, and it is also what the bar-to-hero morph wants
   * to snapshot.
   */
  const [finishing, setFinishing] = useState<WorkoutLog | undefined>(undefined)

  if (report !== undefined) {
    return (
      <SessionReport
        report={report}
        units={settings.units}
        onDismiss={() => {
          setReport(undefined)
        }}
      />
    )
  }

  const workout = activeWorkout.data ?? finishing
  if (workout != null && exercises.data !== undefined) {
    return (
      <Suspense fallback={<Skeleton label="Opening the session" className="h-96" />}>
        <SessionPlayer
          workout={workout}
          exercises={exercises.data}
          units={settings.units}
          restEnabled={settings.restTimerEnabled}
          keepAwake={settings.keepScreenAwake}
          onFinish={() => {
            /*
             * **The session bar becomes the report's hero.** Both carry the
             * `session-hero` transition name, so finishing grows the slim
             * bar into the panel rather than swapping screens.
             */
            setFinishing(workout)
            finishWorkout.mutate(workout.id, {
              onError: () => {
                setFinishing(undefined)
              },
              onSuccess: (finished) => {
                withViewTransition(() => {
                  setReport(finished)
                  setFinishing(undefined)
                  // The report opens at its hero, where the bar was pinned;
                  // left at the player's scroll it opened a screen down.
                  window.scrollTo(0, 0)
                })
              },
            })
          }}
          onAbandon={() => {
            abandonWorkout.mutate(workout.id)
          }}
        />
      </Suspense>
    )
  }

  /*
   * Still resolving whether a workout is active — render nothing rather
   * than the dashboard on a guess, or a page load straight into a session
   * would flash the plan before snapping back to the player.
   */
  // A failed program leaves the schedule disabled and pending for good;
  // the hero shows its own fallback then rather than a blank page.
  const scheduling = schedule.isPending && !program.isError
  if (activeWorkout.isPending || latest.isPending || scheduling || exercises.isPending) return null

  return (
    <div className="space-y-6">
      <FirstRunSetup />
      {/* One strip for the notices, so the hero is not pushed under a stack of them. */}
      <NoticeStrip>
        <SampleNotice />
        <WhatsNew />
        <InstallCard />
      </NoticeStrip>
      <HeroBanner />
      <DeloadSuggestion />
      <Masonry
        items={arrangeCards(
          HOME_CARDS.map((card) => card.key),
          settings.homeCards,
        ).flatMap((key) => {
          const card = HOME_CARDS.find((one) => one.key === key)
          return card === undefined
            ? []
            : [
                {
                  key,
                  node: <Suspense fallback={<Skeleton className="h-48" />}>{card.node}</Suspense>,
                },
              ]
        })}
      />
      <ArrangeCards
        defaults={HOME_CARDS.map((card) => card.key)}
        labels={Object.fromEntries(HOME_CARDS.map((card) => [card.key, card.label]))}
      />
    </div>
  )
}

/** The home page's cards in their default order, with the names the arranger shows. */
const HOME_CARDS: readonly {
  readonly key: string
  readonly label: string
  readonly node: React.ReactNode
}[] = [
  { key: 'session', label: 'Next session', node: <NextSessionCard /> },
  { key: 'ripe', label: 'Ripe for the next session', node: <RipeCard /> },
  { key: 'saved', label: 'Saved sessions', node: <SavedSessionsCard /> },
  { key: 'week', label: 'This week', node: <WeekCard /> },
  { key: 'last-week', label: 'Last week', node: <LastWeekCard /> },
  { key: 'adherence', label: 'Showing up', node: <AdherenceCard /> },
  { key: 'forecast', label: 'Twelve weeks out', node: <ForecastCard /> },
  { key: 'then-now', label: 'Then and now', node: <ThenNowCard /> },
  { key: 'lately', label: 'Lately', node: <BodyMapCard /> },
  { key: 'balance', label: 'Balance', node: <BalanceCard /> },
  { key: 'standards', label: 'Strength', node: <StrengthStandards /> },
  { key: 'goals', label: 'Goals', node: <GoalsCard /> },
  { key: 'trend', label: 'Strength over time', node: <StrengthTrendCard /> },
  { key: 'activity', label: 'Training grid', node: <ActivityHeatmap /> },
  { key: 'times', label: 'When you train', node: <TrainingTimesCard /> },
  { key: 'history', label: 'Recent sessions', node: <TrainingHistory /> },
]
