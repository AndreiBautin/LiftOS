import { Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useServices } from '@/app/context'
import { remainingSets } from '@/domain/logging/workout-log'

import { useActiveWorkout } from './hooks'

/** Screens that are the session, or cover the whole screen, show no pill. */
const HIDDEN = ['/', '/today']

/**
 * A session left open follows you: on any screen but the player, a pill
 * along the bottom names it, counts its sets and its time, and goes back
 * with one press.
 *
 * **The player is the one place a set can be logged**, and the app is
 * one page — so stepping out to a past session or an exercise page mid-
 * workout left the open session nowhere on screen, with the clock still
 * running on it. The pill is how it stays in sight. The clock reads
 * `startedAt` through the clock port every second, as the session bar
 * does.
 */
export function SessionPill() {
  const { pathname } = useLocation()
  const active = useActiveWorkout()
  const workout = active.data ?? undefined

  if (workout === undefined || HIDDEN.includes(pathname) || pathname.startsWith('/wrapped')) {
    return null
  }

  const total = workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0)
  const settled = total - remainingSets(workout)

  return (
    <>
      {/* Room at the foot of the page, so the pill never covers the last card. */}
      <div className="h-20 shrink-0" aria-hidden />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4"
        style={{ paddingBottom: 'calc(0.9rem + var(--safe-bottom))' }}
      >
        <Link
          viewTransition
          to="/today"
          className="session-pill pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-ink-900/85 py-2 pr-4 pl-2 shadow-[0_12px_40px_-12px_rgb(0_0_0/85%)] backdrop-blur-xl"
          aria-label={`Back to ${workout.title}: ${String(settled)} of ${String(total)} sets`}
        >
          <span className="bg-accent-500/20 text-accent-400 flex size-9 items-center justify-center rounded-full">
            <Dumbbell size={16} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="text-ink-50 block max-w-[11rem] truncate text-sm font-semibold">
              {workout.title}
            </span>
            <span className="numeric text-ink-500 block text-xs">
              {settled}/{total} sets · <Clock startedAt={workout.startedAt} />
            </span>
          </span>
          <span className="text-accent-400 ml-1 text-sm font-semibold">Back</span>
        </Link>
      </div>
    </>
  )
}

function Clock({ startedAt }: { readonly startedAt: string }) {
  const clock = useServices().clock
  const [now, setNow] = useState(() => clock.now().getTime())
  useEffect(() => {
    const handle = window.setInterval(() => {
      setNow(clock.now().getTime())
    }, 1000)
    return () => {
      window.clearInterval(handle)
    }
  }, [clock])
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return (
    <>
      {hours > 0 ? `${String(hours)}:${String(minutes).padStart(2, '0')}` : String(minutes)}:{rest}
    </>
  )
}
