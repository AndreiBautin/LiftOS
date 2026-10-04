import { BookmarkPlus, Check } from 'lucide-react'
import { useState } from 'react'

import { useServices, useSettings } from '@/app/context'
import { TEMPLATE_NAME_LIMIT, templateFrom } from '@/domain/logging/template'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { Button } from '@/components/shared/primitives'

/**
 * Keeps a past session's shape by name (`templateFrom`), to start again
 * from the Saved sessions card at the loads of the day it is started. A
 * copy rather than a link, so deleting this session later leaves the
 * template standing.
 */
export function KeepSession({ workout }: { readonly workout: WorkoutLog }) {
  const { settings, update } = useSettings()
  const { ids, clock } = useServices()
  const [name, setName] = useState(workout.title)
  const [saved, setSaved] = useState<string | undefined>(undefined)

  return (
    <div className="well p-3">
      <label htmlFor="keep-name" className="text-ink-300 mb-2 block text-xs">
        Keep this session, to start it again at that day’s loads
      </label>
      {saved === undefined ? (
        <div className="flex gap-2">
          <input
            id="keep-name"
            value={name}
            maxLength={TEMPLATE_NAME_LIMIT}
            onChange={(event) => {
              setName(event.target.value)
            }}
            className="bg-ink-900 border-ink-800 text-ink-100 min-w-0 flex-1 rounded-lg border px-3 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const template = templateFrom(workout, name, ids.next(), clock.now().toISOString())
              update({ templates: [...(settings.templates ?? []), template] })
              setSaved(template.name)
            }}
          >
            <BookmarkPlus size={14} aria-hidden />
            Keep
          </Button>
        </div>
      ) : (
        <p className="text-ink-100 flex items-center gap-2 text-sm" role="status">
          <Check size={14} className="text-good-500" aria-hidden />
          Kept as “{saved}” — it is on the home page under Saved sessions.
        </p>
      )}
    </div>
  )
}
