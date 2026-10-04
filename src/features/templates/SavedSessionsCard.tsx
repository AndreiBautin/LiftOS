import { Bookmark, Play, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSettings } from '@/app/context'
import type { Exercise } from '@/domain/exercises/exercise'
import type { SessionTemplate } from '@/domain/logging/template'
import { Button, Card, CardHeading } from '@/components/shared/primitives'
import { glyphFor } from '@/features/glyphs/glyph-for'
import { MoveGlyph } from '@/features/glyphs/MoveGlyph'
import { useExercises, useStartTemplate } from '@/features/train/hooks'

/** Glyphs drawn per template before the rest are counted. */
const STRIP = 7

/**
 * Sessions kept by name (`settings.templates`), each a strip of its
 * movements' glyphs — the session's shape at a glance — with Start, which
 * opens it at today's loads, and a remove that asks once. Silent until
 * something has been kept.
 */
export function SavedSessionsCard() {
  const { settings, update } = useSettings()
  const library = useExercises().data ?? []
  const start = useStartTemplate()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState<string | undefined>(undefined)
  const templates = settings.templates ?? []
  if (templates.length === 0) return null

  const remove = (id: string) => {
    const left = templates.filter((one) => one.id !== id)
    update({ templates: left.length === 0 ? undefined : left })
    setConfirming(undefined)
  }

  return (
    <Card>
      <CardHeading icon={<Bookmark size={16} aria-hidden />} title="Saved sessions" />
      <ul className="space-y-3">
        {templates.map((template) => (
          <li key={template.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="text-ink-100 block truncate text-sm">{template.name}</span>
              <Strip template={template} library={library} />
            </span>
            {confirming === template.id ? (
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    remove(template.id)
                  }}
                >
                  Remove
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(undefined)
                  }}
                >
                  Keep
                </Button>
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={start.isPending}
                  onClick={() => {
                    start.mutate(template, {
                      onSuccess: () => {
                        void navigate('/today')
                      },
                    })
                  }}
                >
                  <Play size={14} aria-hidden />
                  Start
                </Button>
                <button
                  type="button"
                  aria-label={`Remove ${template.name}`}
                  onClick={() => {
                    setConfirming(template.id)
                  }}
                  className="text-ink-500 hover:text-ink-100 tap-target flex items-center justify-center"
                >
                  <X size={16} aria-hidden />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Strip({
  template,
  library,
}: {
  readonly template: SessionTemplate
  readonly library: readonly Exercise[]
}) {
  const working = template.entries.filter((entry) => entry.role !== 'warmup')
  return (
    <span
      className="text-ink-500 mt-1 flex items-center gap-1.5"
      aria-label={`${String(working.length)} exercises`}
    >
      {working.slice(0, STRIP).map((entry, at) => {
        const exercise = library.find((one) => one.id === entry.exerciseId)
        return exercise === undefined ? null : (
          <MoveGlyph
            key={`${entry.exerciseId}-${String(at)}`}
            glyph={glyphFor(exercise)}
            size={16}
          />
        )
      })}
      {working.length > STRIP && <span className="text-xs">+{working.length - STRIP}</span>}
    </span>
  )
}
