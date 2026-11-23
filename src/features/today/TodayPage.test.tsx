import { render, screen } from '@testing-library/react'
import { deleteDB } from 'idb'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { bootstrap } from '@/app/di'
import { AppProviders } from '@/app/providers'
import { closeAppDatabase } from '@/infrastructure/db/database'
import { readSettings, writeSettings } from '@/infrastructure/storage/settings-store'
import { aSet, aWorkout, anEntry, BENCH } from '@/test/builders/workout'

import { TodayPage } from './TodayPage'

/* jsdom has no layout or media queries; the page asks for both. */
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
  globalThis.ResizeObserver = class {
    observe = (): undefined => undefined
    unobserve = (): undefined => undefined
    disconnect = (): undefined => undefined
  }
  window.scrollTo = () => undefined
  /*
   * A browser runs a view transition's update a frame later, once it has
   * snapshotted the old screen — and that frame is the gap the refetch
   * lands in. jsdom has no transitions, which would run the update at
   * once and close the gap this test exists to watch.
   */
  document.startViewTransition = ((update: () => void) => {
    const done = new Promise<void>((resolve) => {
      setTimeout(() => {
        update()
        resolve()
      }, 100)
    })
    return {
      finished: done,
      ready: done,
      updateCallbackDone: done,
      skipTransition: () => undefined,
    }
  }) as unknown as typeof document.startViewTransition
  Element.prototype.scrollTo = () => undefined
})

afterEach(async () => {
  await closeAppDatabase()
  await deleteDB('lifeos')
  localStorage.clear()
})

async function mountWithOpenSession() {
  const { services } = await bootstrap()
  await services.workouts.save(
    aWorkout({
      title: 'Upper A',
      status: 'in-progress',
      entries: [anEntry({ exerciseId: BENCH, sets: [aSet({ outcome: 'pending' })] })],
    }),
  )
  const router = createMemoryRouter([{ path: '/', element: <TodayPage /> }])
  render(
    <AppProviders services={services}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

/*
 * _"LiftOS must be casual indoor exercise first, not upper/lower with a new
 * skin."_ The phone's own dataset holds a programme session left open with
 * nothing logged; on the old Today that opened the player on every launch.
 */
describe('Today', () => {
  it('opens on the quick log, and an open session never takes the screen', async () => {
    await mountWithOpenSession()
    expect(await screen.findByText('Log anything', {}, { timeout: 5000 })).toBeTruthy()
    expect(await screen.findByText(/A session is still open: Upper A, 0 sets done/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Resume in Routines' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Session tools' })).toBeNull()
    expect(screen.queryByText(/missed|owed|streak|next session/i)).toBeNull()
  })

  it('is the classic programme page again when the lifter chooses Programme first', async () => {
    writeSettings({ ...readSettings().settings, trainingMode: 'program' })
    await mountWithOpenSession()
    expect(
      await screen.findByRole('button', { name: 'Session tools' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.queryByText('Log anything')).toBeNull()
  })
})
