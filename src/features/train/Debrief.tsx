import { ArrowRight, ArrowUpRight, Equal } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Exercise } from '@/domain/exercises/exercise'
import { debrief, type Moved } from '@/domain/logging/debrief'
import type { WorkoutLog } from '@/domain/logging/workout-log'
import { stepFor } from '@/domain/programs/progression'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'

/** Names written out in a line before the rest are counted. */
const NAMED = 3

/**
 * Three plain lines under a finished session (`debrief`): what moved past
 * last time, what held or came in under, and what the bar does next time.
 * **Sentences, not a chart** — the report's cards above already draw; this
 * is the part a coach would say on the way out. A line with nothing to
 * say is left out, and the whole block when all three are.
 */
export function Debrief({
  workout,
  history,
  library,
  units,
}: {
  readonly workout: WorkoutLog
  readonly history: readonly WorkoutLog[]
  readonly library: readonly Exercise[]
  readonly units: WeightUnit
}) {
  const result = debrief(workout, history)
  const exercise = (id: string) => library.find((one) => one.id === id)
  const name = (id: string) => exercise(id)?.name ?? id

  const moved = list(
    result.moved.map((one) => `${name(one.exerciseId)}, ${change(one, units)}`),
    '; ',
  )
  const under = result.held.filter((one) => one.versus.kind !== 'matched')
  const matched = result.held.filter((one) => one.versus.kind === 'matched')
  const held = [
    matched.length > 0 ? `${list(matched.map((one) => name(one.exerciseId)))} matched it` : '',
    under.length > 0 ? `${list(under.map((one) => name(one.exerciseId)))} came in under` : '',
  ]
    .filter((part) => part !== '')
    .join('; ')
  const building = result.next.filter((one) => one.kind === 'build')
  const nextItems = result.next
    .filter((one) => one.kind !== 'build')
    .map((one) => {
      const found = exercise(one.exerciseId)
      const label = name(one.exerciseId)
      if (one.load === undefined || one.load <= 0) {
        return one.kind === 'up' ? `${label} goes up` : `${label} again`
      }
      return one.kind === 'up'
        ? `${label} goes to ${formatLoad(one.load + (found === undefined ? 5 : stepFor(found)), units)}`
        : `${label} stays at ${formatLoad(one.load, units)}`
    })
  // The ordinary case is named last and once: same bar, a rep more.
  if (building.length > 0) {
    nextItems.push(
      `${nextItems.length > 0 ? 'the rest' : building.length === 1 ? name(building[0]?.exerciseId ?? '') : 'every lift'} at the same ${building.length === 1 ? 'bar' : 'bars'}, a rep more`,
    )
  }
  const next = list(nextItems, '; ')

  if (moved === '' && held === '' && next === '') return null

  return (
    <ul className="border-ink-800 mt-5 space-y-2 border-t pt-4 text-sm">
      {moved !== '' && (
        <Line icon={<ArrowUpRight size={14} aria-hidden />} tone="text-accent-400" lead="Moved">
          {moved}.
        </Line>
      )}
      {held !== '' && (
        <Line icon={<Equal size={14} aria-hidden />} tone="text-ink-500" lead="Held">
          {held} — against last time.
        </Line>
      )}
      {next !== '' && (
        <Line
          icon={<ArrowRight size={14} aria-hidden />}
          tone="text-[oklch(0.78_0.11_285)]"
          lead="Next time"
        >
          {next}.
        </Line>
      )}
    </ul>
  )
}

function Line({
  icon,
  tone,
  lead,
  children,
}: {
  readonly icon: ReactNode
  readonly tone: string
  readonly lead: string
  readonly children: ReactNode
}) {
  return (
    <li className="flex gap-2.5">
      <span className={`${tone} mt-0.5 shrink-0`}>{icon}</span>
      <p className="text-ink-300 min-w-0">
        <span className={`${tone} font-medium`}>{lead}:</span> {children}
      </p>
    </li>
  )
}

function change(moved: Moved, units: WeightUnit): string {
  const { versus } = moved
  if (versus.kind === 'heavier') return `${formatLoad(versus.by, units)} heavier`
  if (versus.kind === 'more-reps')
    return `${String(versus.by)} more ${versus.by === 1 ? 'rep' : 'reps'}`
  return 'level'
}

/** "A", "A and B", "A, B and C", then "and N more". */
function list(items: readonly string[], separator = ', '): string {
  if (items.length === 0) return ''
  const named = items.slice(0, NAMED)
  const rest = items.length - named.length
  if (rest > 0)
    return `${named.join(separator)}, plus ${String(rest)} ${rest === 1 ? 'other' : 'others'}`
  if (named.length === 1) return named[0] ?? ''
  return `${named.slice(0, -1).join(separator)} and ${named.at(-1) ?? ''}`
}
