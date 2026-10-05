import { CheckCircle2, Stethoscope } from 'lucide-react'
import { useState } from 'react'

import { useServices } from '@/app/context'
import type { WorkoutId } from '@/domain/ids/ids'
import { dataHealth, type Finding } from '@/domain/logging/health'
import { parseDay } from '@/domain/time/day'
import { Button, Card, CardHeading } from '@/components/shared/primitives'
import { useDeleteWorkout } from '@/features/history/hooks'
import { useAbandonWorkout, useExercises, useRecentWorkouts } from '@/features/train/hooks'

/**
 * What the history holds and anything in it that looks wrong (`dataHealth`):
 * a session left open for days, a copy, a finished session with nothing in
 * it, sets under an exercise the library does not know. Each fix is the
 * operation the app already has — abandon or delete, tombstone and all —
 * and asks once before it runs. An unknown exercise is reported only.
 */
export function DataHealth() {
  const { clock } = useServices()
  const workouts = useRecentWorkouts(5000)
  const exercises = useExercises()
  if (workouts.data === undefined || exercises.data === undefined) return null

  const known = new Set(exercises.data.map((one) => one.id))
  const { counts, findings } = dataHealth(workouts.data, known, clock.now())

  return (
    <Card>
      <CardHeading icon={<Stethoscope size={16} aria-hidden />} title="Health check" />
      <p className="text-ink-300 text-sm">
        <span className="numeric text-ink-50 font-semibold">{counts.sessions}</span> sessions ·{' '}
        <span className="numeric text-ink-50 font-semibold">{counts.sets.toLocaleString()}</span>{' '}
        working sets
        {counts.abandoned > 0 && ` · ${String(counts.abandoned)} abandoned`}
        {counts.first !== undefined && counts.last !== undefined && (
          <span className="text-ink-500 block text-xs">
            {shortDate(counts.first)} to {shortDate(counts.last)}
          </span>
        )}
      </p>
      {findings.length === 0 ? (
        <p className="text-good-500 mt-3 flex items-center gap-1.5 text-sm">
          <CheckCircle2 size={14} aria-hidden /> Everything checks out.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {findings.map((finding) => (
            <FindingRow key={finding.kind} finding={finding} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function FindingRow({ finding }: { readonly finding: Finding }) {
  const abandon = useAbandonWorkout()
  const remove = useDeleteWorkout()
  const [sure, setSure] = useState(false)
  const busy = abandon.isPending || remove.isPending

  const text = describe(finding)
  const fix:
    { readonly label: string; readonly run: (id: WorkoutId) => Promise<unknown> } | undefined =
    finding.kind === 'left-open'
      ? { label: 'Close them', run: (id) => abandon.mutateAsync(id) }
      : finding.kind === 'unknown-exercise'
        ? undefined
        : { label: 'Delete them', run: (id) => remove.mutateAsync(id) }

  return (
    <li className="well flex flex-wrap items-center justify-between gap-2 p-3">
      <p className="text-ink-100 min-w-0 flex-1 text-sm">{text}</p>
      {fix !== undefined && 'workoutIds' in finding && (
        <Button
          size="sm"
          variant={sure ? 'primary' : 'outline'}
          disabled={busy}
          onClick={() => {
            if (!sure) {
              setSure(true)
              return
            }
            // One after another: each is a read-modify-write of the store.
            void finding.workoutIds
              .reduce<Promise<unknown>>(
                (chain, id) => chain.then(() => fix.run(id)),
                Promise.resolve(),
              )
              .finally(() => {
                setSure(false)
              })
          }}
        >
          {sure ? 'Sure?' : fix.label}
        </Button>
      )}
    </li>
  )
}

function describe(finding: Finding): string {
  const n = (count: number, one: string, many: string) =>
    `${String(count)} ${count === 1 ? one : many}`
  switch (finding.kind) {
    case 'left-open':
      return `${n(finding.workoutIds.length, 'session', 'sessions')} left open. Closing keeps any sets logged and drops an empty one.`
    case 'duplicate':
      return `${n(finding.workoutIds.length, 'copy', 'copies')} of a session already in the history.`
    case 'empty':
      return `${n(finding.workoutIds.length, 'finished session', 'finished sessions')} with nothing done in ${finding.workoutIds.length === 1 ? 'it' : 'them'}.`
    case 'unknown-exercise':
      return `Sets under ${n(finding.exerciseIds.length, 'exercise', 'exercises')} this build does not know (${finding.exerciseIds.join(', ')}). They are kept.`
  }
}

function shortDate(day: string): string {
  return parseDay(day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
