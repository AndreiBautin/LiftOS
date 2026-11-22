import { parseActivity, type ActivityEntry, type ActivityId } from '@/domain/logging/activity'
import type { indexTombstones } from '@/domain/sync/tombstone'

/**
 * Activity Jarvis recorded on the user's word, waiting for this device.
 *
 * **Why a second file.** This app is local-first: Jarvis cannot reach the
 * phone's IndexedDB, and the user should not have to type in again what
 * they already told the Guide. Jarvis therefore writes to its own small
 * file beside the sync file in the user's private repository, and never to
 * the sync file itself — so a fault on Jarvis's side can never corrupt the
 * training history. This device reads it on every sync and files what it
 * finds; the ordinary sync then carries the records into the sync file,
 * which is how Jarvis sees them arrive (its receipt says "on the phone"
 * only then).
 *
 * **This device never writes the inbox.** Jarvis owns it and drops an
 * operation once the sync file shows it. Every operation is idempotent, so
 * reading the same inbox twice changes nothing the second time.
 *
 * - `put` files an activity under its own event id. The newer stamp wins,
 *   as in the sync merge, and a newer deletion beats it.
 * - `delete` is an undo: it becomes a tombstone here, as a delete on this
 *   device would.
 */
const INBOX_MAGIC = 'liftos.inbox'
const INBOX_VERSION = 1
/** At most this many operations are read from one inbox. */
const INBOX_LIMIT = 200
/** The inbox's name, beside the sync file in the same folder. */
const INBOX_FILE = 'liftos-inbox.json'

export type InboxOp =
  | { readonly op: 'put'; readonly activity: ActivityEntry & { readonly updatedAt: string } }
  | { readonly op: 'delete'; readonly id: ActivityId; readonly deletedAt: string }

interface ParsedInbox {
  readonly ops: readonly InboxOp[]
  /** Operations present but not exactly valid, which are skipped. */
  readonly refused: number
}

const ID = /^[A-Za-z0-9_.:-]{6,80}$/

/** Where the inbox lives for a sync file at `syncPath`. */
export function inboxPathFor(syncPath: string): string {
  const cut = syncPath.lastIndexOf('/')
  return cut < 0 ? INBOX_FILE : `${syncPath.slice(0, cut)}/${INBOX_FILE}`
}

/**
 * Reads the inbox as untrusted input. A file that is not an inbox at all
 * is `undefined`; a valid inbox keeps its valid operations and counts the
 * rest, so one bad line never blocks the others.
 */
export function parseInbox(text: string): ParsedInbox | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const bag = parsed as Record<string, unknown>
  if (bag.magic !== INBOX_MAGIC || bag.version !== INBOX_VERSION) return undefined
  if (!Array.isArray(bag.ops)) return undefined
  const raw: readonly unknown[] = bag.ops

  const ops: InboxOp[] = []
  let refused = Math.max(0, raw.length - INBOX_LIMIT)
  for (const one of raw.slice(0, INBOX_LIMIT)) {
    const op = opOf(one)
    if (op === undefined) refused += 1
    else ops.push(op)
  }
  return { ops, refused }
}

function opOf(candidate: unknown): InboxOp | undefined {
  if (typeof candidate !== 'object' || candidate === null) return undefined
  const bag = candidate as Record<string, unknown>
  if (bag.op === 'put') {
    const activity = parseActivity(bag.activity)
    if (activity?.updatedAt === undefined || activity.source !== 'jarvis') return undefined
    return { op: 'put', activity: { ...activity, updatedAt: activity.updatedAt } }
  }
  if (bag.op === 'delete') {
    if (typeof bag.id !== 'string' || !ID.test(bag.id)) return undefined
    if (typeof bag.deletedAt !== 'string' || Number.isNaN(Date.parse(bag.deletedAt))) {
      return undefined
    }
    return { op: 'delete', id: bag.id as ActivityId, deletedAt: bag.deletedAt }
  }
  return undefined
}

interface InboxPlan {
  /** Activities to file (new here, or newer than ours). */
  readonly put: readonly ActivityEntry[]
  /** Deletions to record as tombstones. */
  readonly bury: readonly { readonly id: ActivityId; readonly deletedAt: string }[]
  /** Of those, the ones whose record here is older and goes. */
  readonly purge: readonly ActivityId[]
}

/**
 * What applying the inbox would change here, decided without writing.
 *
 * Pure: the caller reads the store and the tombstones, and writes what
 * this returns. Ops are applied in file order, so a put then a delete of
 * the same id ends deleted, and a delete then a newer put ends filed.
 */
export function planInbox(
  ops: readonly InboxOp[],
  ours: ReadonlyMap<string, ActivityEntry>,
  tombstones: ReturnType<typeof indexTombstones>,
): InboxPlan {
  const state = new Map<string, ActivityEntry | { readonly deletedAt: string }>()
  const read = (id: string): ActivityEntry | { readonly deletedAt: string } | undefined => {
    const held = state.get(id)
    if (held !== undefined) return held
    const mine = ours.get(id)
    if (mine !== undefined) return mine
    const deletedAt = tombstones.deletedAt('activities', id)
    return deletedAt === undefined ? undefined : { deletedAt }
  }
  const stampOf = (row: ActivityEntry | { readonly deletedAt: string }): string =>
    'deletedAt' in row ? row.deletedAt : (row.updatedAt ?? '')

  for (const op of ops) {
    const id = op.op === 'put' ? op.activity.id : op.id
    const held = read(id)
    if (op.op === 'put') {
      if (held !== undefined && stampOf(held) >= op.activity.updatedAt) continue
      state.set(id, op.activity)
    } else {
      if (held !== undefined && 'deletedAt' in held && held.deletedAt >= op.deletedAt) continue
      if (held !== undefined && !('deletedAt' in held) && (held.updatedAt ?? '') > op.deletedAt) {
        continue
      }
      state.set(id, { deletedAt: op.deletedAt })
    }
  }

  const put: ActivityEntry[] = []
  const bury: { id: ActivityId; deletedAt: string }[] = []
  const purge: ActivityId[] = []
  for (const [id, row] of state) {
    if ('deletedAt' in row) {
      bury.push({ id: id as ActivityId, deletedAt: row.deletedAt })
      if (ours.has(id)) purge.push(id as ActivityId)
    } else {
      put.push(row)
    }
  }
  return { put, bury, purge }
}
