import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

import type { Exercise } from '@/domain/exercises/exercise'
import { MUSCLE_GROUP_LABELS } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'

/** Rows shown before a search narrows them. */
const SHOWN = 8

/**
 * The library, to add from mid-session: a search over names and muscles,
 * exercises already in the session left out, warm-ups and conditioning
 * too — this is for an extra lift, not a second walk.
 *
 * Folded behind one quiet button at the foot of the player: adding is
 * the exception to running the programme, and an open list there would
 * be the largest thing on the screen most sessions.
 */
export function AddExercisePanel({
  library,
  inSession,
  busy,
  onAdd,
  startOpen = false,
  heading = 'Add after this exercise',
  onClose,
}: {
  readonly library: readonly Exercise[]
  readonly inSession: ReadonlySet<ExerciseId>
  readonly busy: boolean
  readonly onAdd: (exercise: Exercise) => void
  /** Open from the start: an empty session has nothing else to show. */
  readonly startOpen?: boolean
  readonly heading?: string
  /** Opened from elsewhere (the session tools): open at once, and closing hands back. */
  readonly onClose?: () => void
}) {
  const [open, setOpen] = useState(startOpen || onClose !== undefined)
  const close = () => {
    setQuery('')
    if (onClose === undefined) setOpen(false)
    else onClose()
  }
  const [query, setQuery] = useState('')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="text-ink-300 hover:text-accent-400 tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-sm"
      >
        <Plus size={16} aria-hidden /> Add an exercise
      </button>
    )
  }

  const needle = query.trim().toLowerCase()
  const candidates = library
    .filter(
      (one) =>
        !one.isArchived &&
        // Warm-up rows are catalogued as conditioning, so this keeps both out.
        one.intent !== 'conditioning' &&
        !inSession.has(one.id),
    )
    .filter(
      (one) =>
        needle === '' ||
        one.name.toLowerCase().includes(needle) ||
        MUSCLE_GROUP_LABELS[one.primaryMuscle].toLowerCase().includes(needle),
    )
    .toSorted((a, b) => a.name.localeCompare(b.name))
  const shown = needle === '' ? candidates.slice(0, SHOWN) : candidates

  return (
    <div className="well mt-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-ink-100 text-sm font-medium">{heading}</p>
        {!startOpen && (
          <button
            type="button"
            onClick={close}
            className="text-ink-500 hover:text-ink-300 tap-target px-2 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
      <label className="relative block">
        <span className="sr-only">Search exercises to add</span>
        <Search
          size={14}
          className="text-ink-500 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          placeholder="A name or a muscle"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          className="bg-ink-900 border-ink-800 text-ink-100 placeholder:text-ink-500 w-full rounded-lg border py-2 pr-3 pl-8 text-sm"
        />
      </label>
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto" aria-label="Exercises to add">
        {shown.map((one) => (
          <li key={one.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onAdd(one)
                close()
              }}
              className="hover:bg-ink-850 tap-target flex w-full items-center justify-between gap-3 rounded-lg px-2 text-left disabled:opacity-50"
            >
              <span className="text-ink-100 min-w-0 truncate text-sm">{one.name}</span>
              <span className="text-ink-500 shrink-0 text-xs">
                {MUSCLE_GROUP_LABELS[one.primaryMuscle]}
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="text-ink-500 px-2 py-2 text-sm">Nothing matches.</li>}
        {needle === '' && candidates.length > SHOWN && (
          <li className="text-ink-500 px-2 pt-1 text-xs">
            {candidates.length - SHOWN} more — search to find them.
          </li>
        )}
      </ul>
    </div>
  )
}
