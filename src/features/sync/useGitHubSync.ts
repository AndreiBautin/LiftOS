import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { deriveProgram } from '@/application/use-cases/programs/current-program'
import { blockStartOf, scheduleFor } from '@/application/use-cases/programs/schedule'
import { previewWorkout } from '@/application/use-cases/training/start-workout'
import { upcomingSessions, withTodaysPlan, type UpcomingSession } from '@/domain/programs/upcoming'
import type { AthleteState } from '@/domain/resolution/resolve'
import type { AppSettings } from '@/domain/settings/settings'
import { toDayKey } from '@/domain/time/day'
import { GitHubSyncError } from '@/infrastructure/sync/github-file'
import { syncWithGitHub } from '@/infrastructure/sync/github-sync'
import { logger } from '@/shared/logging/logger'

import { syncStore } from './sync-store'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev'

/**
 * How close together two automatic rounds may run.
 *
 * Asked for as syncing "whenever you switch pages", which on a quick tour
 * of the app is a round every second — each a request to GitHub, and a
 * commit whenever something changed. Fifteen seconds keeps the feel of
 * syncing on every move while bounding the traffic. A round asked for by
 * hand, or by connecting, skips it.
 */
const THROTTLE_MS = 15_000

/**
 * How often a visible app checks the file for the other device's changes.
 *
 * Page changes and coming back to the app were the only pulls, so a
 * desktop left open on one screen never saw what the phone had just done.
 * A minute is "soon" for one person on two devices, and only runs while
 * the screen is actually showing — a hidden tab polls nothing.
 */
const VISIBLE_PULL_MS = 60_000

/**
 * Runs sync rounds: on launch, on every change of page, whenever the app
 * comes back to the foreground, after any saved change, and once a minute
 * while the screen is showing.
 *
 * **One round at a time.** A request that arrives mid-round is remembered
 * and run once the round finishes, rather than started beside it — two
 * rounds in parallel would read the same file and race each other's
 * writes, which the retry would survive but nothing would be gained by.
 *
 * Mounted once, in the shell. Silent when no repository is connected.
 */
export function useGitHubSync(): void {
  const services = useServices()
  const { settings, athlete } = useSettings()
  const client = useQueryClient()
  const { pathname } = useLocation()

  const latestSettings = useRef(settings)
  const latestAthlete = useRef(athlete)
  useEffect(() => {
    latestSettings.current = settings
    latestAthlete.current = athlete
  }, [settings, athlete])

  const state = useRef<{
    running: boolean
    again: boolean
    lastRun: number
    trailing: ReturnType<typeof setTimeout> | undefined
  }>({ running: false, again: false, lastRun: 0, trailing: undefined })

  /*
   * The round is defined inside the effect that registers it, rather than
   * as a memoised callback: it calls itself to run a queued request, and a
   * self-referencing `useCallback` is something the compiler cannot keep.
   */
  useEffect(() => {
    const rounds = state.current
    const run = async (force: boolean): Promise<void> => {
      const config = syncStore.get().config
      if (config === undefined) return

      const now = services.clock.now().getTime()
      const wait = THROTTLE_MS - (now - state.current.lastRun)
      if (!force && wait > 0) {
        /*
         * **Deferred, not dropped.** A request inside the window used to
         * return and be forgotten, so a change made seconds after a round
         * sat on this device until some later page change happened to
         * ask again. One trailing round at the end of the window carries
         * every request that arrived during it.
         */
        state.current.trailing ??= setTimeout(() => {
          state.current.trailing = undefined
          void run(false)
        }, wait)
        return
      }
      if (state.current.running) {
        state.current.again = true
        return
      }

      state.current.running = true
      state.current.lastRun = now
      syncStore.phase('syncing')

      try {
        const settings = latestSettings.current
        const upcoming = await upcomingFor(services, settings, latestAthlete.current)
        const result = await syncWithGitHub(config, services, {
          settings,
          appVersion: APP_VERSION,
          now: services.clock.now(),
          ...(upcoming === undefined ? {} : { upcoming }),
        })
        syncStore.synced(services.clock.now().toISOString())
        logger.info('sync.round', {
          pulled: result.pulled,
          purged: result.purged,
          uploaded: result.uploaded,
        })
        // Only when something arrived: refetching every screen after a
        // round that changed nothing would be a flicker for no reason.
        if (result.pulled + result.purged > 0) void client.invalidateQueries()
      } catch (error) {
        const reason = error instanceof GitHubSyncError ? error.reason : 'unexpected'
        syncStore.phase(
          'error',
          error instanceof GitHubSyncError ? error.message : 'Sync failed unexpectedly.',
        )
        logger.warn('sync.failed', { reason })
      } finally {
        state.current.running = false
        if (state.current.again) {
          state.current.again = false
          void run(true)
        }
      }
    }

    syncStore.onRequest((force) => {
      void run(force)
    })

    /*
     * **A saved change asks for a round.** Pushing waited for a page
     * change, so ticking something and putting the phone down left it
     * there. Rounds are not mutations, so this cannot feed itself.
     */
    const unsubscribe = client.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') syncStore.request(false)
    })

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') syncStore.request(false)
    }, VISIBLE_PULL_MS)

    return () => {
      syncStore.onRequest(undefined)
      unsubscribe()
      clearInterval(timer)
      if (rounds.trailing !== undefined) clearTimeout(rounds.trailing)
      rounds.trailing = undefined
    }
  }, [services, client])

  // Launch, and every change of page.
  useEffect(() => {
    syncStore.request(false)
  }, [pathname])

  // Coming back to the app — the moment the other device's changes matter.
  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') syncStore.request(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}

/**
 * The week ahead for the sync file, derived as the schedule screen derives
 * it. A programme that cannot be built is no reason to fail the sync: the
 * round goes ahead and carries the file's calendar along.
 */
async function upcomingFor(
  services: ReturnType<typeof useServices>,
  settings: AppSettings,
  athlete: AthleteState,
): Promise<readonly UpcomingSession[] | undefined> {
  try {
    const exercises = await services.exercises.all()
    const program = deriveProgram(settings, exercises)
    const today = toDayKey(services.clock.now())
    const blockStartedOn = blockStartOf(program, await services.position.get(), today)
    const sessions = upcomingSessions(program, blockStartedOn, today, exercises, settings.dayMoves)
    // The preview opens the next session; it is today's only when it is dated today.
    const schedule = await scheduleFor(program, services, settings.dayMoves)
    if (schedule.next?.on !== today) return sessions
    const preview = await previewWorkout(
      {
        athlete,
        program,
        roundingIncrement: settings.roundingIncrement,
        ...(settings.loadResets !== undefined ? { resets: settings.loadResets } : {}),
        ...(settings.sessionDraft !== undefined ? { draft: settings.sessionDraft } : {}),
        ...(settings.dayMoves !== undefined ? { moves: settings.dayMoves } : {}),
      },
      services,
    )
    return preview === undefined ? sessions : withTodaysPlan(sessions, today, preview, exercises)
  } catch {
    logger.warn('sync.upcoming_failed', {})
    return undefined
  }
}
