import { useId, useState } from 'react'

import { useSettings } from '@/app/context'
import { CUE_LIMIT } from '@/domain/settings/settings'
import { Module } from '@/components/shared/Module'

/**
 * The lifter's own cue for an exercise, written here and read in the
 * player under the exercise's name — "elbows under the bar" where it is
 * needed, rather than in a notes app that is not open at the rack.
 *
 * Saved when the field is left; blank removes it.
 */
export function CueCard({ exerciseId }: { readonly exerciseId: string }) {
  const { settings, update } = useSettings()
  const stored = settings.exerciseCues?.[exerciseId] ?? ''
  const [text, setText] = useState(stored)
  const id = useId()

  const save = () => {
    const cue = text.trim().slice(0, CUE_LIMIT)
    if (cue === stored) return
    const others = Object.fromEntries(
      Object.entries(settings.exerciseCues ?? {}).filter(([one]) => one !== exerciseId),
    )
    update({ exerciseCues: cue === '' ? others : { ...others, [exerciseId]: cue } })
  }

  return (
    <Module title="Your cue" action={<span className="text-ink-500">Shown in the session</span>}>
      <label htmlFor={id} className="sr-only">
        Your cue for this exercise
      </label>
      <input
        id={id}
        type="text"
        maxLength={CUE_LIMIT}
        value={text}
        placeholder="Elbows under the bar, push the floor away…"
        onChange={(event) => {
          setText(event.target.value)
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="bg-ink-900 border-ink-800 text-ink-100 placeholder:text-ink-500 mt-1 h-11 w-full rounded-[0.75rem] border px-3 text-sm"
      />
    </Module>
  )
}
