import { useId, useState } from 'react'

import { useServices } from '@/app/context'
import { Module } from '@/components/shared/Module'
import { Button } from '@/components/shared/primitives'
import { describeActivity, newestFirst, type ActivityEntry } from '@/domain/logging/activity'
import { mondayOf, parseDay, toDayKey, WEEKDAY_NAMES } from '@/domain/time/day'

import { useActivities, useLogActivity, useRemoveActivity } from './hooks'

/** Offered first; anything else can be typed. Never added to a plan. */
const COMMON = ['Push-ups', 'Curls', 'Lateral raises'] as const

/**
 * Casual training, logged in one line: what, and how many.
 *
 * _"casual pushups/curls/lateral raises should be valid activity, not failed
 * strict bodybuilding sessions"_. No session opens, nothing is planned, and
 * nothing can be fallen short of: the week lists what was done, and an empty
 * week says only that nothing is logged. A count is reps **in total** unless
 * "per side" is ticked, because 100 curls and 100 curls per arm are different
 * work. What Jarvis filed on the user's word shows "via Jarvis".
 */
export function ActivityModule() {
  const services = useServices()
  const today = toDayKey(services.clock.now())
  const monday = mondayOf(today)
  const activities = useActivities()
  const log = useLogActivity()
  const remove = useRemoveActivity()
  const ids = useId()

  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('')
  const [perSide, setPerSide] = useState(false)

  const all = activities.data ?? []
  const week = all.filter((entry) => entry.day >= monday && entry.day <= today).sort(newestFirst)
  const names = [...new Set([...COMMON, ...[...all].sort(newestFirst).map((one) => one.exercise)])]
  const count = Number(reps)
  const ready = exercise.trim() !== '' && Number.isInteger(count) && count >= 1 && count <= 5000

  return (
    <Module title="Activity">
      <form
        className="mt-2 grid grid-cols-[minmax(0,1fr)_6rem] gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!ready) return
          log.mutate(
            {
              exercise: exercise.trim(),
              amount: { kind: 'total', reps: count, per: perSide ? 'per-side' : 'total' },
            },
            {
              onSuccess: () => {
                setReps('')
                /*
                 * Cleared every time: left ticked, the next count would be
                 * filed per side without anyone saying so, and 100 per side
                 * is twice the work of 100 total.
                 */
                setPerSide(false)
              },
            },
          )
        }}
      >
        <label className="sr-only" htmlFor={`${ids}-what`}>
          Exercise
        </label>
        <input
          id={`${ids}-what`}
          list={`${ids}-names`}
          value={exercise}
          maxLength={60}
          autoComplete="off"
          placeholder="Exercise"
          className="bg-ink-900 border-ink-800 text-ink-50 h-11 min-w-0 rounded-md border px-3 text-sm"
          onChange={(event) => {
            setExercise(event.target.value)
          }}
        />
        <datalist id={`${ids}-names`}>
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <label className="sr-only" htmlFor={`${ids}-reps`}>
          Reps
        </label>
        <input
          id={`${ids}-reps`}
          inputMode="numeric"
          pattern="[0-9]*"
          value={reps}
          placeholder="Reps"
          className="bg-ink-900 border-ink-800 text-ink-50 numeric h-11 min-w-0 rounded-md border px-3 text-sm"
          onChange={(event) => {
            setReps(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))
          }}
        />
        <label className="tap-target text-ink-300 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={perSide}
            className="size-5"
            onChange={(event) => {
              setPerSide(event.target.checked)
            }}
          />
          Per side
        </label>
        <Button type="submit" variant="primary" disabled={!ready || log.isPending}>
          Log
        </Button>
      </form>
      {log.isError && (
        <p role="alert" className="text-bad-500 mt-2 text-sm">
          Not saved. Nothing was logged.
        </p>
      )}

      <div className="mt-3 text-sm" aria-live="polite">
        {activities.isError ? (
          <p className="text-warn-500">Activity could not be read on this device.</p>
        ) : week.length === 0 ? (
          <p className="text-ink-500">Nothing logged this week.</p>
        ) : (
          <ul className="space-y-1">
            {week.map((entry) => (
              <ActivityRow
                key={entry.id}
                entry={entry}
                removing={remove.isPending && remove.variables === entry.id}
                onRemove={() => {
                  remove.mutate(entry.id)
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </Module>
  )
}

function ActivityRow({
  entry,
  removing,
  onRemove,
}: {
  readonly entry: ActivityEntry
  readonly removing: boolean
  readonly onRemove: () => void
}) {
  const weekday = WEEKDAY_NAMES[parseDay(entry.day).getUTCDay()] ?? entry.day
  return (
    <li className="flex min-h-11 items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="text-ink-500">{weekday.slice(0, 3)} </span>
        <span className="text-ink-100">{describeActivity(entry)}</span>
        {entry.source === 'jarvis' && <span className="text-ink-500"> · via Jarvis</span>}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={removing}
        aria-label={`Remove ${describeActivity(entry)}`}
        onClick={onRemove}
      >
        Remove
      </Button>
    </li>
  )
}
