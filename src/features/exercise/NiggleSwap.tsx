import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useSettings } from '@/app/context'
import { rankSubstitutes } from '@/domain/exercises/exercise'
import type { ExerciseId } from '@/domain/ids/ids'
import { NIGGLE_LABELS, nigglesOnExercise } from '@/domain/logging/niggles'
import { EMPTY_DRAFT, swapInDraft } from '@/domain/programs/session-draft'
import { useExercises, useNiggles } from '@/features/train/hooks'
import { useNextSession } from '@/features/train/useNextSession'

/** Alternatives offered beside a stalled, niggling lift. */
const OFFERED = 3

/**
 * Under a stalled lift that has also had a joint flagged on it: **the two
 * together are the usual sign the movement is the problem, not the
 * effort**, so the card offers another exercise for the same muscle. When
 * the next session holds this lift, the offer is a swap **for that one
 * session** — written as a session draft, the same edit the plan card's
 * Edit makes, so nothing about the routine changes. Otherwise each is a
 * link to its page. Offered, never applied; silent without a niggle.
 */
export function NiggleSwap({ exerciseId }: { readonly exerciseId: ExerciseId }) {
  const { settings, update } = useSettings()
  const niggles = nigglesOnExercise(useNiggles() ?? [], exerciseId)
  const library = useExercises().data ?? []
  const { day, on } = useNextSession()

  const exercise = library.find((one) => one.id === exerciseId)
  if (niggles.length === 0 || exercise === undefined) return null

  const options = rankSubstitutes(
    exercise,
    library.filter(
      (one) =>
        one.primaryMuscle === exercise.primaryMuscle &&
        one.intent !== 'conditioning' &&
        one.id !== exercise.id,
    ),
  ).slice(0, OFFERED)
  const slot = day?.slots.find(
    (one) => one.exercise.kind === 'specific' && one.exercise.exerciseId === exerciseId,
  )
  const draft = settings.sessionDraft?.on === on ? settings.sessionDraft : undefined
  const swappedTo = slot === undefined ? undefined : draft?.swaps[slot.id]
  const joints = niggles.map((one) => NIGGLE_LABELS[one.region].toLowerCase()).join(' and ')
  const flagged = niggles.reduce((sum, one) => sum + one.count, 0)
  const times = flagged === 1 ? 'once' : flagged === 2 ? 'twice' : `${String(flagged)} times`

  return (
    <div className="border-ink-800 mt-3 border-t pt-3">
      <p className="text-ink-300 text-sm">
        Your {joints} {niggles.length > 1 ? 'were' : 'was'} flagged on this lift {times} lately. A
        stall and a niggle together is often the movement, not the effort.
      </p>
      {options.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {options.map((one) =>
            slot !== undefined && day !== undefined && on !== undefined ? (
              <li key={one.id}>
                <button
                  type="button"
                  aria-pressed={swappedTo === one.id}
                  onClick={() => {
                    update({
                      sessionDraft: swapInDraft(
                        day,
                        draft ?? EMPTY_DRAFT(on),
                        slot.id,
                        swappedTo === one.id ? exerciseId : one.id,
                      ),
                    })
                  }}
                  className="border-ink-700 text-ink-100 aria-pressed:border-accent-500 aria-pressed:text-accent-400 tap-target flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium"
                >
                  <ArrowLeftRight size={12} aria-hidden />
                  {one.name}
                </button>
              </li>
            ) : (
              <li key={one.id}>
                <Link
                  viewTransition
                  to={`/exercise/${one.id}`}
                  className="border-ink-700 text-ink-100 tap-target flex items-center rounded-full border px-3 text-xs font-medium"
                >
                  {one.name}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
      {slot !== undefined && options.length > 0 && (
        <p className="text-ink-500 mt-2 text-xs">
          {swappedTo === undefined
            ? 'A tap swaps it in for the next session only.'
            : 'Swapped in for the next session only — tap again to put it back.'}
        </p>
      )}
    </div>
  )
}
