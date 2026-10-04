import { NotebookPen } from 'lucide-react'
import { appendDictation } from '@/features/dictation/dictation'
import { DictateButton } from '@/features/dictation/DictateButton'
import { useId, useState } from 'react'

import type { WorkoutId } from '@/domain/ids/ids'
import { NOTE_LIMIT } from '@/application/use-cases/training/note-workout'
import { Card } from '@/components/shared/primitives'

import { useNoteWorkout } from './hooks'

/**
 * A line about the session, written where it was read: the report as it
 * ends, and the session's own page afterwards. Saved when the field is
 * left rather than on every key, so a sentence is one write; "Saved"
 * says it landed.
 */
export function SessionNote({
  workoutId,
  initial,
}: {
  readonly workoutId: WorkoutId
  readonly initial: string | undefined
}) {
  const [text, setText] = useState(initial ?? '')
  const [saved, setSaved] = useState(initial ?? '')
  const note = useNoteWorkout()
  const id = useId()

  return (
    <Card>
      <label
        htmlFor={id}
        className="text-ink-500 mb-2 flex items-center justify-between gap-2 text-sm"
      >
        <span className="flex items-center gap-2">
          <NotebookPen size={16} aria-hidden />
          Session note
        </span>
        <span className="text-ink-500 text-xs" aria-live="polite">
          {note.isPending ? 'Saving…' : text.trim() === saved.trim() && saved !== '' ? 'Saved' : ''}
        </span>
      </label>
      <div className="flex items-start gap-2">
        <textarea
          id={id}
          rows={2}
          maxLength={NOTE_LIMIT}
          value={text}
          placeholder="Slept badly, new gym, felt strong…"
          onChange={(event) => {
            setText(event.target.value)
          }}
          onBlur={() => {
            if (text.trim() === saved.trim()) return
            note.mutate(
              { id: workoutId, notes: text },
              {
                onSuccess: (updated) => {
                  setSaved(updated.notes ?? '')
                },
              },
            )
          }}
          className="bg-ink-900 border-ink-800 text-ink-100 placeholder:text-ink-500 min-w-0 flex-1 resize-none rounded-lg border px-3 py-2 text-sm"
        />
        {/* Dictation has no blur to save on, so what was heard is saved as it lands. */}
        <DictateButton
          label="Dictate the session note"
          onHeard={(heard) => {
            const next = appendDictation(text, heard, NOTE_LIMIT)
            setText(next)
            note.mutate(
              { id: workoutId, notes: next },
              {
                onSuccess: (updated) => {
                  setSaved(updated.notes ?? '')
                },
              },
            )
          }}
        />
      </div>
    </Card>
  )
}
