import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { PageSkeleton } from './PageSkeleton'

describe('a page while it loads', () => {
  it('names the page and says once that it is loading', () => {
    render(
      <MemoryRouter>
        <PageSkeleton title="Records" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Records' })).toBeTruthy()
    expect(screen.getAllByRole('status', { name: 'Loading' })).toHaveLength(1)
  })
})
