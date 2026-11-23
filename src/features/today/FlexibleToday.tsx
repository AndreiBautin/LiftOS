import { LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link } from 'react-router-dom'

import { useServices } from '@/app/context'
import { buttonStyles } from '@/components/shared/styles'
import { remainingSets } from '@/domain/logging/workout-log'
import { ActivityModule } from '@/features/activity/ActivityModule'
import { InstallCard } from '@/features/pwa/InstallCard'
import { SyncBadge } from '@/features/sync/SyncBadge'
import { useActiveWorkout } from '@/features/train/hooks'
import { formatDate } from '@/lib/format-date'
import { lazyNamed } from '@/lib/lazy-named'

import { NoticeStrip } from './NoticeStrip'
import { SampleNotice } from './SampleNotice'
import { WhatsNew } from './WhatsNew'

const EverythingSheet = lazyNamed(
  () => import('@/features/navigation/EverythingSheet'),
  'EverythingSheet',
)

/**
 * Today when training is flexible, which is the default: a log, not a plan.
 *
 * _"LiftOS must be casual indoor exercise first, not upper/lower with a new
 * skin."_ The first screen is the quick log for any exercise. No next
 * programme day, no missed day, no session player taking the screen over:
 * the programme is still here, whole, under Routines, and a session left
 * open there is named in one line rather than opened on top of everything.
 * Settings → "Programme first" puts the classic Today back.
 */
export function FlexibleToday() {
  const { clock } = useServices()
  const active = useActiveWorkout()
  const [everything, setEverything] = useState(false)
  const open = active.data ?? undefined

  const dateLine = formatDate(clock.now(), { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-5">
      <header className="-mt-1 flex items-center justify-between gap-3">
        <h1 className="text-ink-300 min-w-0 truncate text-sm font-medium">
          Today <span className="text-ink-500">· {dateLine}</span>
        </h1>
        <div className="-mr-2.5 flex shrink-0 items-center">
          <SyncBadge />
          <button
            type="button"
            aria-label="Everything"
            aria-haspopup="dialog"
            onClick={() => {
              setEverything(true)
            }}
            className={buttonStyles({ variant: 'ghost', className: 'px-2.5' })}
          >
            <LayoutGrid size={20} aria-hidden />
          </button>
          <Link
            viewTransition
            to="/settings"
            aria-label="Settings"
            className={buttonStyles({ variant: 'ghost', className: 'px-2.5' })}
          >
            <SlidersHorizontal size={20} aria-hidden />
          </Link>
        </div>
      </header>
      {everything && (
        <Suspense fallback={null}>
          <EverythingSheet
            onClose={() => {
              setEverything(false)
            }}
          />
        </Suspense>
      )}

      <ActivityModule />

      <NoticeStrip>
        <SampleNotice />
        <WhatsNew />
        <InstallCard />
      </NoticeStrip>

      <nav aria-label="More" className="border-ink-800 border-t pt-3 text-sm">
        {open !== undefined && (
          <p className="text-ink-400 mb-2">
            A session is still open: {open.title},{' '}
            {String(
              open.entries.reduce((sum, entry) => sum + entry.sets.length, 0) - remainingSets(open),
            )}{' '}
            sets done. It waits under Routines until you finish or abandon it there.
          </p>
        )}
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link viewTransition to="/routines" className={buttonStyles({ variant: 'ghost' })}>
              {open === undefined ? 'Routines' : 'Resume in Routines'}
            </Link>
          </li>
          <li>
            <Link viewTransition to="/history" className={buttonStyles({ variant: 'ghost' })}>
              History
            </Link>
          </li>
          <li>
            <Link viewTransition to="/exercises" className={buttonStyles({ variant: 'ghost' })}>
              Exercises
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
