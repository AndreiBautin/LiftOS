import { ArrowDown, ArrowUp, ArrowUpDown, Link2 } from 'lucide-react'
import { useState } from 'react'

import type { ExerciseId } from '@/domain/ids/ids'
import { moveEntry } from '@/domain/logging/reorder'
import { isEntryComplete, type WorkoutLog } from '@/domain/logging/workout-log'
import { cn } from '@/lib/cn'

/**
 * The open session's order, changeable: a list of its exercises with a
 * button up and a button down on each (`moveEntry`), the one on screen
 * lit. Buttons rather than a drag — the list sits at the foot of a page
 * that scrolls, and a drag there fights the scroll.
 *
 * A button is offered only where the move is allowed, so the warm-up and
 * a superset pair simply have none; the pair carries a link mark to say
 * why. Folded behind one quiet button, like adding.
 */
export function ReorderPanel({
  workout,
  current,
  nameOf,
  busy,
  onMove,
}: {
  readonly workout: WorkoutLog
  readonly current: number
  readonly nameOf: (id: ExerciseId) => string
  readonly busy: boolean
  readonly onMove: (at: number, by: -1 | 1) => void
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="text-ink-300 hover:text-accent-400 tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-sm"
      >
        <ArrowUpDown size={16} aria-hidden /> Change the order
      </button>
    )
  }

  return (
    <div className="border-ink-800 mt-2 rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-ink-100 text-sm font-medium">The order</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
          }}
          className="text-ink-500 hover:text-ink-300 tap-target px-2 text-sm"
        >
          Done
        </button>
      </div>
      <ol className="space-y-1">
        {workout.entries.map((entry, at) => {
          if (entry.sets.length > 0 && entry.sets.every((set) => set.isWarmup)) return null
          const name = nameOf(entry.exerciseId)
          const up = typeof moveEntry(workout.entries, at, -1) !== 'string'
          const down = typeof moveEntry(workout.entries, at, 1) !== 'string'
          return (
            <li
              key={`${entry.exerciseId}-${String(at)}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1',
                at === current && 'bg-accent-500/10',
              )}
            >
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  at === current ? 'text-accent-400 font-medium' : 'text-ink-100',
                  isEntryComplete(entry) && 'text-ink-500 line-through',
                )}
              >
                {name}
              </span>
              {entry.superset !== undefined && (
                <Link2 size={14} className="text-ink-500 shrink-0" aria-label="In a superset" />
              )}
              <button
                type="button"
                disabled={!up || busy}
                aria-label={`Move ${name} up`}
                onClick={() => {
                  onMove(at, -1)
                }}
                className="text-ink-300 hover:text-accent-400 tap-target flex items-center justify-center rounded-md disabled:opacity-25"
              >
                <ArrowUp size={16} aria-hidden />
              </button>
              <button
                type="button"
                disabled={!down || busy}
                aria-label={`Move ${name} down`}
                onClick={() => {
                  onMove(at, 1)
                }}
                className="text-ink-300 hover:text-accent-400 tap-target flex items-center justify-center rounded-md disabled:opacity-25"
              >
                <ArrowDown size={16} aria-hidden />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
