import { Suspense, useState } from 'react'

import { lazyNamed } from '@/lib/lazy-named'
import { Skeleton } from '@/components/shared/Skeleton'

import { NoticeStrip } from './NoticeStrip'
import { InstallCard } from '@/features/pwa/InstallCard'
import { WhatsNew } from './WhatsNew'
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
import { SessionReport } from '@/features/train/SessionReport'

import { FirstRunSetup } from './FirstRunSetup'
import { HeroBanner } from './HeroBanner'
import { SampleNotice } from './SampleNotice'

/*
 * **Below the first screen, everything loads on demand.** The hero is what a
 * phone shows first, and the first paint should not wait on the forecast maths
 * or the body map a screen or more down. The player is split too: it renders
 * only while a session is open. The service worker precaches every chunk, so
 * offline is unchanged.
 */
const BodyModule = lazyNamed(() => import('@/features/train/BodyModule'), 'BodyModule')
const RecentModule = lazyNamed(() => import('@/features/history/RecentModule'), 'RecentModule')
const SavedSessionsCard = lazyNamed(
  () => import('@/features/templates/SavedSessionsCard'),
  'SavedSessionsCard',
)
const SessionPlayer = lazyNamed(() => import('@/features/train/SessionPlayer'), 'SessionPlayer')
const ShowingUpModule = lazyNamed(
  () => import('@/features/train/ShowingUpModule'),
  'ShowingUpModule',
)
const StrengthModule = lazyNamed(() => import('@/features/train/StrengthModule'), 'StrengthModule')

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
 * **It opens on the session**, which is what it is for, and everything else
 * is a scroll down. Sixteen cards became four modules, each one picture and a
 * few sentences, because they were asking the same three questions: how strong
 * am I, am I turning up, and what have I trained. See `HeroBanner`.
 *
 * **The takeover is the rule that survived every arrangement.** An
 * unfinished workout is the only thing that matters until it is
 * finished, and burying it behind a dashboard is how half-logged
 * sessions get lost — so while one is open this page *is* the session
 * player, and after finishing it is the report until dismissed. Starting
 * a session therefore needs no navigation: the active-workout query
 * refetches and the page swaps itself.
 *
 * **The modules are balanced by measured height, not assigned to columns.**
 * `Masonry` takes as many ~360px columns as the width holds and drops each into
 * the shortest one; on a phone it is a single stack in this order.
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
    <div className="space-y-5">
      <FirstRunSetup />
      <HeroBanner />
      {/* One strip for the notices, under the session rather than over it. */}
      <NoticeStrip>
        <SampleNotice />
        <WhatsNew />
        <InstallCard />
      </NoticeStrip>
      <Masonry
        items={MODULES.map(({ key, node }) => ({
          key,
          node: <Suspense fallback={<Skeleton className="h-48" />}>{node}</Suspense>,
        }))}
      />
    </div>
  )
}

/** Today below the session, in order. */
const MODULES: readonly { readonly key: string; readonly node: React.ReactNode }[] = [
  { key: 'strength', node: <StrengthModule /> },
  { key: 'showing-up', node: <ShowingUpModule /> },
  { key: 'body', node: <BodyModule /> },
  { key: 'saved', node: <SavedSessionsCard /> },
  { key: 'recent', node: <RecentModule /> },
]
