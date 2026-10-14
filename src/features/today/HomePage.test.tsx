import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteDB } from 'idb'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { bootstrap } from '@/app/di'
import { AppProviders } from '@/app/providers'
import { closeAppDatabase } from '@/infrastructure/db/database'
import { aSet, aWorkout, anEntry, BENCH } from '@/test/builders/workout'

import { HomePage } from './HomePage'

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

/*
 * **Finishing goes straight from the player to the report.** Finishing
 * refetches the active workout, which comes back empty before the report
 * is set; Today used to build its whole dashboard in that gap — sixteen
 * cards and a forced layout, two seconds at a phone's speed — only to
 * replace it. Nothing on screen was wrong afterwards, so nothing but a
 * test watching the gap would notice it coming back.
 */
describe('finishing a session', () => {
  it('never draws the dashboard between the player and the report', async () => {
    const { services } = await bootstrap()
    await services.workouts.save(
      aWorkout({
        status: 'in-progress',
        entries: [
          anEntry({
            exerciseId: BENCH,
            sets: [aSet({ outcome: 'completed' }), aSet({ outcome: 'pending' })],
          }),
        ],
      }),
    )

    const router = createMemoryRouter([{ path: '/', element: <HomePage /> }])
    render(
      <AppProviders services={services}>
        <RouterProvider router={router} />
      </AppProviders>,
    )
    const finish = await screen.findByRole('button', { name: /Finish early/ }, { timeout: 5000 })

    // The hero's Start button is the dashboard's first control.
    let dashboardDrawn = false
    const watcher = new MutationObserver(() => {
      if (screen.queryByRole('button', { name: /^Start (session|it early)$/ }) !== null) {
        dashboardDrawn = true
      }
    })
    watcher.observe(document.body, { childList: true, subtree: true })

    await act(async () => {
      await userEvent.click(finish)
    })
    await screen.findByText(/Session complete/i, {}, { timeout: 5000 })
    watcher.disconnect()

    expect(dashboardDrawn).toBe(false)
  }, 20_000)
})
