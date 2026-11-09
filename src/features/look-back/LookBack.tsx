import { Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/shared/PageHeader'
import { PeriodStep } from '@/components/shared/PeriodStep'
import { cn } from '@/lib/cn'

const VIEWS = [
  { id: 'month', label: 'Month', to: '/month' },
  { id: 'block', label: 'Block', to: '/block' },
  { id: 'year', label: 'Year', to: '/year' },
  { id: 'muscles', label: 'Muscles', to: '/muscles' },
] as const

/**
 * One way of looking back at a stretch of time, whichever stretch.
 *
 * **These were four screens with four tiles and links between them**, asking
 * one question at four zooms. They share this now: the view, the period with a
 * step either way, and Play and Share where a view has them. Their addresses are
 * unchanged, so a link or a home-screen shortcut still lands, and each view keeps
 * its own picture: a wall calendar, a fan, twelve small months, a landscape.
 */
export function LookBack({
  view,
  period,
  subtitle,
  older,
  newer,
  olderLabel,
  newerLabel,
  play,
  share,
  children,
}: {
  readonly view: (typeof VIEWS)[number]['id']
  readonly period: string
  readonly subtitle?: string
  readonly older: string | undefined
  readonly newer: string | undefined
  readonly olderLabel: string
  readonly newerLabel: string
  /** Where this period plays as a story. */
  readonly play?: string | undefined
  readonly share?: ReactNode
  readonly children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader
        title={period}
        {...(subtitle === undefined ? {} : { subtitle })}
        action={
          <>
            <PeriodStep to={older} label={olderLabel} back />
            <PeriodStep to={newer} label={newerLabel} />
          </>
        }
      />
      <nav aria-label="Look back by" className="bg-ink-900 -mt-2 flex gap-1 rounded-[0.875rem] p-1">
        {VIEWS.map((one) => (
          <Link
            key={one.id}
            viewTransition
            to={one.to}
            aria-current={one.id === view ? 'page' : undefined}
            className={cn(
              'flex h-11 flex-1 items-center justify-center rounded-[0.6875rem] text-sm',
              one.id === view ? 'bg-ink-800 text-ink-50 font-semibold' : 'text-ink-500',
            )}
          >
            {one.label}
          </Link>
        ))}
      </nav>
      {(play !== undefined || share !== undefined) && (
        <div className="mt-2 flex min-h-11 items-center justify-end gap-2">
          {play !== undefined && (
            <Link
              viewTransition
              to={play}
              className="text-accent-400 tap-target flex items-center gap-1.5 px-2 text-sm font-medium"
            >
              <Play size={14} aria-hidden />
              Play
            </Link>
          )}
          {share}
        </div>
      )}
      <div className="mt-3">{children}</div>
    </div>
  )
}
