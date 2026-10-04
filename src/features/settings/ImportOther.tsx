import { useQueryClient } from '@tanstack/react-query'
import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'

import { useServices, useSettings } from '@/app/context'
import {
  importTraining,
  type ImportTrainingResult,
} from '@/application/use-cases/training/import-training'
import type { ExerciseId } from '@/domain/ids/ids'
import { matchExercise, readTrainingExport, type ImportedExport } from '@/domain/logging/import-csv'
import type { WeightUnit } from '@/domain/units/weight'
import { Button } from '@/components/shared/primitives'
import { useExercises } from '@/features/train/hooks'
import { cn } from '@/lib/cn'

/**
 * History from Strong or Hevy, brought across (`readTrainingExport`,
 * `importTraining`). Choose the export, and before anything is written
 * the screen says what it found — how many sessions, over what dates —
 * and **asks about every exercise name**: each is matched to the library
 * where the name is close enough (`matchExercise`) and left out where it
 * is not, and every one can be changed. Strong does not say its unit, so
 * that is asked too. Importing the same file again adds nothing.
 */
export function ImportOther() {
  const services = useServices()
  const { settings } = useSettings()
  const library = useExercises().data ?? []
  const client = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [read, setRead] = useState<ImportedExport | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [mapping, setMapping] = useState<Record<string, ExerciseId | null>>({})
  const [from, setFrom] = useState<WeightUnit>(settings.units)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportTrainingResult | undefined>(undefined)

  const names = read === undefined ? [] : distinctNames(read)
  const sortedLibrary = library
    .filter((one) => !one.isArchived)
    .toSorted((a, b) => a.name.localeCompare(b.name))

  const choose = (file: File) => {
    setResult(undefined)
    void file.text().then((text) => {
      const parsed = readTrainingExport(text)
      if ('error' in parsed) {
        setError(parsed.error)
        setRead(undefined)
        return
      }
      setError(undefined)
      setRead(parsed)
      setFrom(parsed.units ?? settings.units)
      setMapping(
        Object.fromEntries(
          distinctNames(parsed).map((name) => [name, matchExercise(name, library)?.id ?? null]),
        ),
      )
    })
  }

  return (
    <div className="space-y-3">
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a CSV file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file !== undefined) choose(file)
          event.target.value = ''
        }}
      />
      <Button
        variant="ghost"
        full
        onClick={() => {
          input.current?.click()
        }}
      >
        <FileUp size={16} aria-hidden /> Import from Strong or Hevy (CSV)
      </Button>

      {error !== undefined && (
        <p role="alert" className="text-warn-500 text-sm">
          {error}
        </p>
      )}

      {result !== undefined && (
        <p role="status" className="text-ink-300 text-sm">
          Imported <span className="text-ink-50 font-semibold">{result.imported}</span> session
          {result.imported === 1 ? '' : 's'}
          {result.alreadyHere > 0 && ` · ${String(result.alreadyHere)} already here`}
          {result.leftOut > 0 &&
            ` · ${String(result.leftOut)} exercise${result.leftOut === 1 ? '' : 's'} left out`}
          .
        </p>
      )}

      {read !== undefined && (
        <div className="well space-y-3 p-3">
          <p className="text-ink-100 text-sm">
            {read.source === 'strong' ? 'Strong' : 'Hevy'} export ·{' '}
            <span className="font-semibold">{read.sessions.length}</span> sessions
            {read.sessions.length > 0 &&
              `, ${read.sessions[0]?.date ?? ''} to ${read.sessions.at(-1)?.date ?? ''}`}
          </p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-300">Loads are in</span>
            {(['lb', 'kg'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                aria-pressed={from === unit}
                disabled={read.units !== undefined}
                onClick={() => {
                  setFrom(unit)
                }}
                className={cn(
                  'tap-target rounded-full border px-3 text-xs font-medium disabled:opacity-60',
                  from === unit
                    ? 'border-accent-500/60 bg-accent-500/15 text-accent-400'
                    : 'border-ink-800 text-ink-300',
                )}
              >
                {unit}
              </button>
            ))}
            {read.units !== undefined && (
              <span className="text-ink-500 text-xs">(from the file)</span>
            )}
          </div>

          <ul className="max-h-80 space-y-1.5 overflow-y-auto" aria-label="Match each exercise">
            {names.map((name) => (
              <li key={name} className="flex items-center gap-2">
                <span className="text-ink-100 min-w-0 flex-1 truncate text-sm">{name}</span>
                <select
                  aria-label={`What ${name} is here`}
                  value={mapping[name] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setMapping((current) => ({
                      ...current,
                      [name]: value === '' ? null : (value as ExerciseId),
                    }))
                  }}
                  className={cn(
                    'bg-ink-900 border-ink-800 tap-target max-w-[48%] rounded-lg border px-2 text-sm',
                    (mapping[name] ?? null) === null ? 'text-ink-500' : 'text-ink-100',
                  )}
                >
                  <option value="">Leave out</option>
                  {sortedLibrary.map((one) => (
                    <option key={one.id} value={one.id}>
                      {one.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              disabled={busy || read.sessions.length === 0}
              onClick={() => {
                setBusy(true)
                void importTraining({ exported: read, mapping, from, to: settings.units }, services)
                  .then((done) => {
                    setResult(done)
                    setRead(undefined)
                    void client.invalidateQueries()
                  })
                  .catch((thrown: unknown) => {
                    setError(thrown instanceof Error ? thrown.message : 'The import failed.')
                  })
                  .finally(() => {
                    setBusy(false)
                  })
              }}
            >
              {busy ? 'Importing…' : `Import ${String(read.sessions.length)} sessions`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRead(undefined)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function distinctNames(read: ImportedExport): readonly string[] {
  return [
    ...new Set(read.sessions.flatMap((session) => session.entries.map((entry) => entry.name))),
  ].toSorted((a, b) => a.localeCompare(b))
}
