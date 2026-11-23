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

async function logOne(fields: {
  exercise?: string
  reps: string
  sets?: string
  load?: string
  perSide?: boolean
}) {
  const user = userEvent.setup()
  await act(async () => {
    if (fields.exercise !== undefined) {
      // The name stays after a log, for the next set of the same thing.
      await user.clear(await screen.findByLabelText('Exercise'))
      await user.type(screen.getByLabelText('Exercise'), fields.exercise)
    }
    await user.type(screen.getByLabelText('Reps'), fields.reps)
    if (fields.sets !== undefined) await user.type(screen.getByLabelText(/^Sets/), fields.sets)
    if (fields.load !== undefined) await user.type(screen.getByLabelText(/^Load/), fields.load)
    if (fields.perSide === true) await user.click(screen.getByRole('radio', { name: 'Per side' }))
    await user.click(screen.getByRole('button', { name: 'Log' }))
  })
}

describe('logging casual activity', () => {
  it('says only that nothing is logged, never that anything was missed', async () => {
    await mount()
    expect(await screen.findByText('Nothing logged in the last 7 days.')).toBeTruthy()
    expect(screen.queryByText(/missed|owed|streak/i)).toBeNull()
    // No record, no quick choice: nothing is offered that reads as history.
    expect(screen.queryByRole('group', { name: 'Recently logged' })).toBeNull()
  })

  it('files a day total as a total, and per side only when chosen', async () => {
    const services = await mount()
    await logOne({ exercise: 'Curls', reps: '100' })
    expect(await screen.findByText('Curls · 100 reps total')).toBeTruthy()

    await logOne({ reps: '50', perSide: true })
    expect(await screen.findByText('Curls · 50 reps per side')).toBeTruthy()
    // Never carried into the next count: it must be said again.
    expect(screen.getByRole('radio', { name: 'Total' }).getAttribute('aria-checked')).toBe('true')

    const stored = await services.activities.all()
    expect(stored.map((one) => one.amount)).toEqual(
      expect.arrayContaining([
        { kind: 'total', reps: 100, per: 'total' },
        { kind: 'total', reps: 50, per: 'per-side' },
      ]),
    )
    expect(stored.every((one) => one.source === 'app' && one.updatedAt !== undefined)).toBe(true)
    // Totals and per-side counts are added up apart, never into one number.
    expect(screen.getByText(/100 reps total · 50 reps per side/)).toBeTruthy()
  })

  it('files sets and a load only as typed, in the unit of this device', async () => {
    const services = await mount()
    await logOne({ exercise: 'Lateral raises', reps: '12', sets: '3', load: '25' })
    expect(
      await screen.findByText('Lateral raises · 3 sets total (12×25lb, 12×25lb, 12×25lb)'),
    ).toBeTruthy()
    const [entry] = await services.activities.all()
    expect(entry?.unit).toBe('lb')

    await logOne({ exercise: 'Push-ups', reps: '15', sets: '2' })
    const pushups = (await services.activities.all()).find((one) => one.exercise === 'Push-ups')
    expect(pushups?.amount).toEqual({
      kind: 'sets',
      sets: [{ reps: 15 }, { reps: 15 }],
      per: 'total',
    })
    expect(pushups?.unit).toBeUndefined()
  })

  it('refuses a load with no set count rather than inventing a set', async () => {
    const services = await mount()
    const user = userEvent.setup()
    await act(async () => {
      await user.type(await screen.findByLabelText('Exercise'), 'Curls')
      await user.type(screen.getByLabelText('Reps'), '20')
      await user.type(screen.getByLabelText(/^Load/), '25')
    })
    expect(screen.getByText('A load needs the number of sets it was lifted for.')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Log' }).disabled).toBe(true)
    expect(await services.activities.all()).toEqual([])
  })

  it('offers what was actually logged as one-tap choices', async () => {
    await mount()
    await logOne({ exercise: 'Curls', reps: '40' })
    const user = userEvent.setup()
    const exercise = screen.getByLabelText<HTMLInputElement>('Exercise')
    await act(async () => {
      await user.clear(exercise)
      await user.click(await screen.findByRole('button', { name: 'Curls' }))
    })
    expect(exercise.value).toBe('Curls')
  })

  it('takes a log back with Undo, leaving a tombstone', async () => {
    const services = await mount()
    await logOne({ exercise: 'Push-ups', reps: '20' })
    const user = userEvent.setup()
    await act(async () => {
      await user.click(await screen.findByRole('button', { name: 'Undo' }))
    })
    expect(await screen.findByText('Nothing logged in the last 7 days.')).toBeTruthy()
    expect(await services.activities.all()).toEqual([])
    expect((await services.tombstones.all()).some((one) => one.collection === 'activities')).toBe(
      true,
    )
  })

  it('puts a removed entry back with Undo, newer than its tombstone', async () => {
    const services = await mount()
    await logOne({ exercise: 'Push-ups', reps: '20' })
    const user = userEvent.setup()
    await act(async () => {
      await user.click(
        await screen.findByRole('button', { name: 'Remove Push-ups · 20 reps total' }),
      )
    })
    expect(await screen.findByText('Nothing logged in the last 7 days.')).toBeTruthy()
    const buried = (await services.tombstones.all()).find((one) => one.collection === 'activities')
    expect(buried).toBeDefined()

    await act(async () => {
      await user.click(await screen.findByRole('button', { name: 'Undo' }))
    })
    expect(await screen.findByText('Push-ups · 20 reps total')).toBeTruthy()
    const [back] = await services.activities.all()
    expect((back?.updatedAt ?? '') >= (buried?.deletedAt ?? '~')).toBe(true)
  })
})
