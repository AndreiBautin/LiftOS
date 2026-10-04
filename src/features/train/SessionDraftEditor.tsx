import { ArrowDown, ArrowUp, RotateCcw, Undo2, X } from 'lucide-react'

import { useSettings } from '@/app/context'
import { rankSubstitutes, type Exercise } from '@/domain/exercises/exercise'
import type { ExerciseId } from '@/domain/ids/ids'
import type { ProgramDay } from '@/domain/programs/program'
import {
  applyDraft,
  EMPTY_DRAFT,
  isEmptyDraft,
  moveInDraft,
  swapInDraft,
  toggleDropped,
  type SessionDraft,
} from '@/domain/programs/session-draft'
import { glyphFor } from '@/features/glyphs/glyph-for'
import { MoveGlyph } from '@/features/glyphs/MoveGlyph'

/** Alternatives offered in a swap: the same muscle, best match first. */
const OFFERED = 6

/**
 * The next session, editable before it starts (`session-draft`): each
 * working exercise can move up or down, be swapped for another that
 * trains the same muscle, or be dropped for this session; Reset puts it
 * back as planned. **This one session only** — the routine is not
 * touched, and the draft is spent once the session starts or its day
 * passes. A swapped exercise plans from its own history, as at Start.
 */
export function SessionDraftEditor({
  day,
  on,
  library,
}: {
  readonly day: ProgramDay
  readonly on: string
  readonly library: readonly Exercise[]
}) {
  const { settings, update } = useSettings()
  const stored = settings.sessionDraft
  const draft: SessionDraft = stored?.on === on ? stored : EMPTY_DRAFT(on)
  const save = (next: SessionDraft) => {
    update({ sessionDraft: isEmptyDraft(next) ? undefined : next })
  }
  const edited = applyDraft(day, draft, on)
  const working = edited.slots.filter((slot) => slot.role !== 'warmup')
  const dropped = day.slots.filter((slot) => draft.dropped.includes(slot.id))
  const lookup = (id: ExerciseId | undefined) => library.find((one) => one.id === id)

  return (
    <div className="well mt-3 space-y-2 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-ink-300 text-xs">This session only — the routine stays as it is.</p>
        {!isEmptyDraft(draft) && (
          <button
            type="button"
            onClick={() => {
              save(EMPTY_DRAFT(on))
            }}
            className="text-accent-400 tap-target flex items-center gap-1 px-1 text-xs font-medium"
          >
            <RotateCcw size={12} aria-hidden /> Reset
          </button>
        )}
      </div>
      <ol className="space-y-1.5">
        {working.map((slot, at) => {
          const id = slot.exercise.kind === 'specific' ? slot.exercise.exerciseId : undefined
          const exercise = lookup(id)
          const original = day.slots.find((one) => one.id === slot.id)?.exercise
          const originalExercise = lookup(
            original?.kind === 'specific' ? original.exerciseId : undefined,
          )
          const options =
            originalExercise === undefined
              ? []
              : rankSubstitutes(
                  originalExercise,
                  library.filter(
                    (one) =>
                      one.primaryMuscle === originalExercise.primaryMuscle &&
                      one.intent !== 'conditioning',
                  ),
                ).slice(0, OFFERED)
          return (
            <li key={slot.id} className="flex flex-wrap items-center gap-x-2 sm:flex-nowrap">
              {exercise !== undefined && (
                <MoveGlyph glyph={glyphFor(exercise)} size={18} className="text-ink-500 shrink-0" />
              )}
              {options.length === 0 ? (
                // Nothing else trains this muscle: a menu of one is not a choice.
                <span className="text-ink-100 min-w-0 flex-1 basis-[calc(100%-2rem)] truncate text-sm sm:basis-0">
                  {exercise?.name}
                </span>
              ) : (
                <label className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-0">
                  <span className="sr-only">Exercise in place of {originalExercise?.name}</span>
                  <select
                    value={id}
                    onChange={(event) => {
                      save(swapInDraft(day, draft, slot.id, event.target.value as ExerciseId))
                    }}
                    className="bg-ink-900 border-ink-800 text-ink-100 h-11 w-full truncate rounded-lg border px-2 text-sm"
                  >
                    {originalExercise !== undefined && (
                      <option value={originalExercise.id}>{originalExercise.name}</option>
                    )}
                    {options.map((one) => (
                      <option key={one.id} value={one.id}>
                        {one.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {/* On a phone the name takes the line and the controls sit under it. */}
              <span className="ml-auto flex">
                <button
                  type="button"
                  aria-label={`Move ${exercise?.name ?? 'exercise'} up`}
                  disabled={at === 0}
                  onClick={() => {
                    save(moveInDraft(day, draft, slot.id, -1))
                  }}
                  className="text-ink-300 tap-target flex items-center justify-center disabled:opacity-30"
                >
                  <ArrowUp size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${exercise?.name ?? 'exercise'} down`}
                  disabled={at === working.length - 1}
                  onClick={() => {
                    save(moveInDraft(day, draft, slot.id, 1))
                  }}
                  className="text-ink-300 tap-target flex items-center justify-center disabled:opacity-30"
                >
                  <ArrowDown size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Drop ${exercise?.name ?? 'exercise'} from this session`}
                  onClick={() => {
                    save(toggleDropped(draft, slot.id))
                  }}
                  className="text-ink-300 hover:text-bad-500 tap-target flex items-center justify-center"
                >
                  <X size={16} aria-hidden />
                </button>
              </span>
            </li>
          )
        })}
      </ol>
      {dropped.length > 0 && (
        <ul className="border-ink-800 space-y-1 border-t pt-2">
          {dropped.map((slot) => {
            const name = lookup(
              slot.exercise.kind === 'specific' ? slot.exercise.exerciseId : undefined,
            )?.name
            return (
              <li key={slot.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink-500 truncate line-through">{name}</span>
                <button
                  type="button"
                  onClick={() => {
                    save(toggleDropped(draft, slot.id))
                  }}
                  className="text-accent-400 tap-target flex shrink-0 items-center gap-1 px-1 text-xs font-medium"
                >
                  <Undo2 size={12} aria-hidden /> Bring back
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
