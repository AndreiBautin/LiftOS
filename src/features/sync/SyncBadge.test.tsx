import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SyncBadgeView } from './SyncBadge'

const config = {
  owner: 'someone',
  repo: 'training-data',
  path: 'lifeos-sync.json',
  token: 'not-a-real-token',
  lastSyncedAt: '2026-10-04T11:56:00Z',
}
const now = new Date('2026-10-04T12:00:00Z')
const noop = () => undefined

describe('the sync badge', () => {
  it('draws nothing when no repository is connected', () => {
    const { container } = render(
      <SyncBadgeView snapshot={{ phase: 'off' }} now={now} onSync={noop} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('says how long ago the last round was', () => {
    render(<SyncBadgeView snapshot={{ phase: 'idle', config }} now={now} onSync={noop} />)
    expect(screen.getByRole('button', { name: /Synced 4m ago/ })).toBeTruthy()
  })

  /* The whole point: a failure is said, not discovered later. */
  it('says a failure in words, with the reason', () => {
    render(
      <SyncBadgeView
        snapshot={{ phase: 'error', config, message: 'The token was refused.' }}
        now={now}
        onSync={noop}
      />,
    )
    expect(screen.getByText('Sync failed')).toBeTruthy()
    expect(screen.getByRole('button', { name: /The token was refused/ })).toBeTruthy()
  })
})
