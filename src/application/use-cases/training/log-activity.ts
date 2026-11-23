import type { IdGenerator } from '@/domain/ids/ids'
import {
  asActivityId,
  parseActivity,
  type ActivityAmount,
  type ActivityEntry,
  type ActivityId,
} from '@/domain/logging/activity'
import type { ActivityRepository, Clock } from '@/domain/repositories/ports'
import { toDayKey } from '@/domain/time/day'

/**
 * Logging casual activity from this device, and taking it back.
 *
 * The record is checked by the same `parseActivity` that reads one from a
 * file or from Jarvis, so a tap cannot store what an import would refuse.
 */
interface ActivityDeps {
  readonly activities: ActivityRepository
  readonly ids: IdGenerator
  readonly clock: Clock
}

export interface ActivityInput {
  readonly exercise: string
  readonly amount: ActivityAmount
  readonly unit?: 'lb' | 'kg'
  /** Defaults to today on this device's calendar. */
  readonly day?: string
  readonly note?: string
}

class ActivityRefused extends Error {}

export async function logActivity(
  deps: ActivityDeps,
  input: ActivityInput,
): Promise<ActivityEntry> {
  const now = deps.clock.now()
  const entry = parseActivity({
    id: deps.ids.next(),
    day: input.day ?? toDayKey(now),
    exercise: input.exercise,
    amount: input.amount,
    ...(input.unit === undefined ? {} : { unit: input.unit }),
    source: 'app',
    ...(input.note === undefined || input.note.trim() === '' ? {} : { note: input.note }),
    createdAt: now.toISOString(),
  })
  if (entry === undefined) throw new ActivityRefused('That is not an activity this app can file.')
  await deps.activities.save(entry)
  return entry
}

/** Deletes it, leaving a tombstone so a sync does not bring it back. */
export async function removeActivity(deps: ActivityDeps, id: ActivityId): Promise<void> {
  await deps.activities.remove(asActivityId(id))
}

/**
 * Puts back an activity just removed — the Undo after Remove.
 *
 * `save` stamps it now, so it is newer than its own tombstone and a sync
 * keeps it rather than burying it again. Checked like any other write.
 */
export async function restoreActivity(deps: ActivityDeps, entry: ActivityEntry): Promise<void> {
  const checked = parseActivity(entry)
  if (checked === undefined) throw new ActivityRefused('That is not an activity this app can file.')
  await deps.activities.save(checked)
}
