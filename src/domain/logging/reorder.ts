import type { LogEntry } from './workout-log'

/** Why an entry cannot move that way, for the screen to say. */
export type MoveRefusal = 'edge' | 'warmup' | 'superset'

/**
 * An open session's exercises with one moved a place up or down.
 *
 * **Warm-ups stay where they are** — a run of warm-up rows is one step at
 * the top of the session, and an exercise moved above it would be lifted
 * cold. **A superset pair does not move**, and nothing moves between its
 * halves: the pair is two entries next to each other by definition, and
 * moving one half would quietly break what the player alternates. Unpair
 * first. Positions are renumbered so `order` matches what is on screen.
 */
export function moveEntry(
  entries: readonly LogEntry[],
  at: number,
  by: -1 | 1,
): readonly LogEntry[] | MoveRefusal {
  const to = at + by
  const moving = entries[at]
  const other = entries[to]
  if (moving === undefined || other === undefined) return 'edge'
  if (isWarmupOnly(moving) || isWarmupOnly(other)) return 'warmup'
  if (moving.superset !== undefined || other.superset !== undefined) return 'superset'
  const next = [...entries]
  next[at] = other
  next[to] = moving
  return next.map((entry, order) => ({ ...entry, order }))
}

function isWarmupOnly(entry: LogEntry): boolean {
  return entry.sets.length > 0 && entry.sets.every((set) => set.isWarmup)
}
