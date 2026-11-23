import { useId, useState } from 'react'

import { useServices, useSettings } from '@/app/context'
import { Module } from '@/components/shared/Module'
import { Button } from '@/components/shared/primitives'
import {
  describeActivity,
  newestFirst,
  quickAmount,
  recentExercises,
  tallyActivities,
  type ActivityEntry,
  type RepScope,
} from '@/domain/logging/activity'
import { parseDay, shiftDay, toDayKey, WEEKDAY_NAMES } from '@/domain/time/day'
import { cn } from '@/lib/cn'

import { useActivities, useLogActivity, useRemoveActivity, useRestoreActivity } from './hooks'

/** How many logged names are offered as one-tap choices. */
const QUICK_CHOICES = 6

/** What the last tap did, so it can be taken back. */
type Undoable =
  | { readonly kind: 'logged'; readonly entry: ActivityEntry }
  | { readonly kind: 'removed'; readonly entry: ActivityEntry }

const REFUSALS = {
  reps: 'Reps must be a whole number from 1.',
  sets: 'Sets must be a whole number from 1, or left blank.',
  load: 'Load must be a number, or left blank.',
  'load-needs-sets': 'A load needs the number of sets it was lifted for.',
} as const

/**
 * The first thing LiftOS asks: what did you do?
 *
 * _"most lifts will be inside until the house upgrade ... wants hitting
 * curls etc."_ Any exercise, typed or picked from the names this device has
 * actually logged, with reps and — only when they were said — sets and a
 * load. Reps are **in total** or **per side**, chosen every time and never
 * carried into the next log, because 100 curls and 100 curls per arm are
 * different work. Nothing is planned, so nothing can be missed: the list
 * below says what was logged and the last seven days add it up as stated.
 */
export function ActivityModule() {
  const services = useServices()
  const { settings } = useSettings()
  const today = toDayKey(services.clock.now())
  const from = shiftDay(today, -6)
  const activities = useActivities()
  const log = useLogActivity()
  const remove = useRemoveActivity()
  const restore = useRestoreActivity()
  const ids = useId()

  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('')
  const [sets, setSets] = useState('')
  const [load, setLoad] = useState('')
  const [per, setPer] = useState<RepScope>('total')
  const [last, setLast] = useState<Undoable | undefined>(undefined)

  const all = activities.data ?? []
  const recent = all.filter((entry) => entry.day >= from && entry.day <= today).sort(newestFirst)
  const choices = recentExercises(all, QUICK_CHOICES)
  const tally = tallyActivities(all, from, today)
  const amount = quickAmount({ reps, sets, load, per })
  const named = exercise.trim() !== ''
  const typed = reps !== '' || sets !== '' || load !== ''
  const ready = named && amount.ok

  return (
    <Module title="Log anything">
      {choices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Recently logged">
          {choices.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={exercise.trim().toLowerCase() === name.toLowerCase()}
              className="quick-choice tap-target border-ink-800 text-ink-200 aria-pressed:border-accent-500 aria-pressed:text-accent-300 rounded-md border px-3 text-sm"
              onClick={() => {
                setExercise(name)
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <form
        className="mt-3 grid grid-cols-3 gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!ready) return
          log.mutate(
            {
              exercise: exercise.trim(),
              amount: amount.amount,
              ...(amount.loaded ? { unit: settings.units } : {}),
            },
            {
              onSuccess: (entry) => {
                setLast({ kind: 'logged', entry })
                setReps('')
                setSets('')
                setLoad('')
                /*
                 * Cleared every time: left on, the next count would be
                 * filed per side without anyone saying so, and 100 per side
                 * is twice the work of 100 total.
                 */
                setPer('total')
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
          value={exercise}
          maxLength={60}
          autoComplete="off"
          autoCapitalize="sentences"
          placeholder="Exercise, e.g. curls"
          className="bg-ink-900 border-ink-800 text-ink-50 col-span-3 h-11 rounded-md border min-w-0 px-3 text-sm"
          onChange={(event) => {
            setExercise(event.target.value)
          }}
        />
        <NumberBox
          id={`${ids}-reps`}
          label={sets.trim() === '' ? 'Reps' : 'Reps / set'}
          value={reps}
          onChange={setReps}
        />
        <NumberBox
          id={`${ids}-sets`}
          label="Sets"
          hint="optional"
          value={sets}
          onChange={setSets}
        />
        <NumberBox
          id={`${ids}-load`}
          label={`Load ${settings.units}`}
          hint="optional"
          decimal
          value={load}
          onChange={setLoad}
        />
        <div
          role="radiogroup"
          aria-label="Reps are counted"
          className="col-span-3 grid grid-cols-2 gap-2"
        >
          {(['total', 'per-side'] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              role="radio"
              aria-checked={per === scope}
              className={cn(
                'tap-target rounded-md border text-sm',
                per === scope ? 'border-accent-500 text-accent-300' : 'border-ink-800 text-ink-400',
              )}
              onClick={() => {
                setPer(scope)
              }}
            >
              {scope === 'total' ? 'Total' : 'Per side'}
            </button>
          ))}
        </div>
        <Button
          type="submit"
          variant="primary"
          className="col-span-3"
          disabled={!ready || log.isPending}
        >
          Log
        </Button>
      </form>
      {typed && !amount.ok && (
        <p className="text-ink-500 mt-2 text-sm">{REFUSALS[amount.reason]}</p>
      )}
      {log.isError && (
        <p role="alert" className="text-bad-500 mt-2 text-sm">
          Not saved. Nothing was logged.
        </p>
      )}
      {last !== undefined && (
        <p className="text-ink-300 mt-2 flex min-h-11 items-center justify-between gap-3 text-sm">
          <span className="min-w-0" role="status">
            {last.kind === 'logged' ? 'Logged ' : 'Removed '}
            {describeActivity(last.entry)}
          </span>
          <Button
            variant="ghost"
            disabled={remove.isPending || restore.isPending}
            onClick={() => {
              const taken = last
              if (taken.kind === 'logged') {
                remove.mutate(taken.entry.id, {
                  onSuccess: () => {
                    setLast(undefined)
                  },
                })
              } else {
                restore.mutate(taken.entry, {
                  onSuccess: () => {
                    setLast(undefined)
                  },
                })
              }
            }}
          >
            Undo
          </Button>
        </p>
      )}

      <div className="mt-3 text-sm">
        {activities.isError ? (
          <p className="text-warn-500">Activity could not be read on this device.</p>
        ) : activities.isPending ? null : recent.length === 0 ? (
          <p className="text-ink-500">Nothing logged in the last 7 days.</p>
        ) : (
          <>
            <ul className="space-y-1" aria-label="Last 7 days">
              {recent.map((entry) => (
                <ActivityRow
                  key={entry.id}
                  entry={entry}
                  today={today}
                  removing={remove.isPending && remove.variables === entry.id}
                  onRemove={() => {
                    remove.mutate(entry.id, {
                      onSuccess: () => {
                        setLast({ kind: 'removed', entry })
                      },
                    })
                  }}
                />
              ))}
            </ul>
            <h3 className="text-ink-500 mt-4 text-sm font-medium">Last 7 days, as logged</h3>
            <ul className="mt-1 space-y-1">
              {tally.map((one) => (
                <li key={one.exercise} className="text-ink-200">
                  <span className="text-ink-100">{one.exercise}</span>
                  <span className="text-ink-400"> · {tallyWords(one)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Module>
  )
}

/** The stated quantities, each kept in its own scope; nothing is converted. */
function tallyWords(one: ReturnType<typeof tallyActivities>[number]): string {
  const parts: string[] = []
  if (one.totalReps > 0) parts.push(`${String(one.totalReps)} reps total`)
  if (one.perSideReps > 0) parts.push(`${String(one.perSideReps)} reps per side`)
  if (one.reportedSets > 0) {
    parts.push(`${String(one.reportedSets)} ${one.reportedSets === 1 ? 'set' : 'sets'} reported`)
  }
  if (one.minutes > 0) parts.push(`${String(one.minutes)} min`)
  return parts.join(' · ')
}

function NumberBox({
  id,
  label,
  hint,
  decimal = false,
  value,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly hint?: string
  readonly decimal?: boolean
  readonly value: string
  readonly onChange: (value: string) => void
}) {
  return (
    <span className="min-w-0">
      <label htmlFor={id} className="text-ink-500 block text-xs">
        {label}
      </label>
      <input
        id={id}
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        autoComplete="off"
        placeholder={hint}
        className="bg-ink-900 border-ink-800 text-ink-50 numeric mt-1 rounded-md border h-11 w-full min-w-0 px-3 text-sm"
        onChange={(event) => {
          const raw = event.target.value
          onChange(
            decimal ? raw.replace(/[^0-9.]/g, '').slice(0, 7) : raw.replace(/\D/g, '').slice(0, 4),
          )
        }}
      />
    </span>
  )
}

function ActivityRow({
  entry,
  today,
  removing,
  onRemove,
}: {
  readonly entry: ActivityEntry
  readonly today: string
  readonly removing: boolean
  readonly onRemove: () => void
}) {
  const when =
    entry.day === today
      ? 'Today'
      : entry.day === shiftDay(today, -1)
        ? 'Yesterday'
        : (WEEKDAY_NAMES[parseDay(entry.day).getUTCDay()] ?? entry.day).slice(0, 3)
  return (
    <li className="flex min-h-11 items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="text-ink-500">{when} </span>
        <span className="text-ink-100">{describeActivity(entry)}</span>
        {entry.source === 'jarvis' && <span className="text-ink-500"> · via Jarvis</span>}
      </span>
      <Button
        variant="ghost"
        disabled={removing}
        aria-label={`Remove ${describeActivity(entry)}`}
        onClick={onRemove}
      >
        Remove
      </Button>
    </li>
  )
}
