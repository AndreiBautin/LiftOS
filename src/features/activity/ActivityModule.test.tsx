import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteDB } from 'idb'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { bootstrap } from '@/app/di'
import { AppProviders } from '@/app/providers'
import { closeAppDatabase } from '@/infrastructure/db/database'

import { ActivityModule } from './ActivityModule'

afterEach(async () => {
  await closeAppDatabase()
  await deleteDB('lifeos')
  localStorage.clear()
})

async function mount() {
  const { services } = await bootstrap()
  const router = createMemoryRouter([{ path: '/', element: <ActivityModule /> }])
  render(
    <AppProviders services={services}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return services
}

describe('logging casual activity', () => {
  it('says only that nothing is logged, never that anything was missed', async () => {
    await mount()
    expect(await screen.findByText('Nothing logged this week.')).toBeTruthy()
    expect(screen.queryByText(/missed|owed|streak/i)).toBeNull()
  })

  it('files a day total as a total, and per side only when ticked', async () => {
    const services = await mount()
    const user = userEvent.setup()
    await act(async () => {
      await user.type(await screen.findByLabelText('Exercise'), 'Curls')
      await user.type(screen.getByLabelText('Reps'), '100')
      await user.click(screen.getByRole('button', { name: 'Log' }))
    })
    expect(await screen.findByText('Curls · 100 reps total')).toBeTruthy()

    await act(async () => {
      await user.type(screen.getByLabelText('Reps'), '50')
      await user.click(screen.getByLabelText('Per side'))
      await user.click(screen.getByRole('button', { name: 'Log' }))
    })
    expect(await screen.findByText('Curls · 50 reps per side')).toBeTruthy()
    // Never carried into the next count: it must be said again.
    expect(screen.getByLabelText<HTMLInputElement>('Per side').checked).toBe(false)

    const stored = await services.activities.all()
    expect(stored.map((one) => one.amount)).toEqual(
      expect.arrayContaining([
        { kind: 'total', reps: 100, per: 'total' },
        { kind: 'total', reps: 50, per: 'per-side' },
      ]),
    )
    expect(stored.every((one) => one.source === 'app' && one.updatedAt !== undefined)).toBe(true)
  })

  it('removing leaves a tombstone, so a sync cannot bring it back', async () => {
    const services = await mount()
    const user = userEvent.setup()
    await act(async () => {
      await user.type(await screen.findByLabelText('Exercise'), 'Push-ups')
      await user.type(screen.getByLabelText('Reps'), '20')
      await user.click(screen.getByRole('button', { name: 'Log' }))
    })
    const remove = await screen.findByRole('button', { name: 'Remove Push-ups · 20 reps total' })
    await act(async () => {
      await user.click(remove)
    })
    expect(await screen.findByText('Nothing logged this week.')).toBeTruthy()
    const buried = await services.tombstones.all()
    expect(buried.some((one) => one.collection === 'activities')).toBe(true)
  })
})
