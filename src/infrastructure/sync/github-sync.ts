import {
  buildBackup,
  parseBackup,
  serialiseBackup,
  type BackupRepositories,
  type ExportOptions,
} from '@/infrastructure/backup/backup-service'
import { mergeNewer, recordsFingerprint } from '@/infrastructure/backup/sync-merge'
import type { ProgramPosition } from '@/domain/programs/position'
import type { UpcomingSession } from '@/domain/programs/upcoming'
import type { PositionRepository } from '@/domain/repositories/ports'

import { indexTombstones } from '@/domain/sync/tombstone'
import { inboxPathFor, parseInbox, planInbox } from '@/domain/sync/inbox'
import { logger } from '@/shared/logging/logger'

import { GitHubSyncError, readFile, writeFile, type GitHubTarget } from './github-file'

/**
 * Files what Jarvis left in its inbox (`domain/sync/inbox.ts`).
 *
 * **Never fails the sync.** The inbox is Jarvis's, and a missing, refused
 * or malformed one is logged and skipped: the user's own records still
 * sync. Read once a round, before the sync file, so what it files goes up
 * in the same write.
 */
async function applyInbox(
  target: GitHubTarget,
  repositories: SyncRepositories,
  fetchFn: typeof fetch = fetch,
): Promise<number> {
  let text: string | undefined
  try {
    text = (await readFile({ ...target, path: inboxPathFor(target.path) }, fetchFn))?.text
  } catch {
    logger.warn('sync.inbox-unreadable', {})
    return 0
  }
  if (text === undefined) return 0
  const inbox = parseInbox(text)
  if (inbox === undefined) {
    logger.warn('sync.inbox-malformed', {})
    return 0
  }
  if (inbox.refused > 0) logger.warn('sync.inbox-refused', { count: inbox.refused })
  const ours = new Map((await repositories.activities.all()).map((row) => [row.id, row]))
  const plan = planInbox(inbox.ops, ours, indexTombstones(await repositories.tombstones.all()))
  if (plan.put.length > 0) await repositories.activities.restoreMany(plan.put)
  if (plan.bury.length > 0) {
    await repositories.tombstones.record(
      plan.bury.map(({ id, deletedAt }) => ({ id, collection: 'activities' as const, deletedAt })),
    )
  }
  for (const id of plan.purge) await repositories.activities.purge(id)
  return plan.put.length + plan.bury.length
}

/**
 * One round of sync with the file in the repository: read it, merge it in,
 * and write back what this device now holds — but only if that differs.
 *
 * **The backup is the payload, on purpose.** Its envelope, checksum,
 * collection table and tombstones are already built and tested for
 * moving a whole database through a file; a sync is that file going to a
 * repository instead of a Downloads folder, merged by `mergeNewer`
 * instead of the import's file-wins merge.
 *
 * **Nothing is written when nothing changed**, judged by
 * `recordsFingerprint`, which ignores order and settings. Without it
 * every page switch on either device would be a commit, and two devices
 * would trade identical files forever.
 *
 * **A refused write is a race, not an error.** The other device wrote
 * between this read and this write, so the round starts again from a
 * fresh read and merges what it missed. Three attempts is generous for
 * two devices one person uses.
 */
interface SyncRun {
  readonly pulled: number
  readonly purged: number
  readonly uploaded: boolean
  /** Activities filed or undone from Jarvis's inbox this round. */
  readonly inboxed: number
}

const ATTEMPTS = 3

/**
 * Where the lifter is travels beside the records, not inside the backup.
 *
 * It was device-local on purpose: one cursor two devices both advance has
 * no correct record-level merge. That held while the phone was the only
 * device that trained. Reported once sync existed: _"my phone still shows
 * Push A while desktop shows Pull B."_ One person trains on one device at
 * a time, so the **later move wins** — a session finished, skipped,
 * reopened or a week picked by hand all stamp it, and the other device
 * adopts it on its next round.
 *
 * Outside the envelope's `data` deliberately: the file import still
 * leaves the position alone, which is what restoring an old backup should
 * do, and the checksum covers exactly what it covered before.
 */
export type SyncRepositories = BackupRepositories & { readonly position?: PositionRepository }

function isPosition(value: unknown): value is ProgramPosition {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    ['cycleNumber', 'blockIndex', 'weekIndex', 'dayIndex'].every(
      (key) => typeof row[key] === 'number' && Number.isInteger(row[key]) && row[key] >= 0,
    ) &&
    typeof row.startedAt === 'string' &&
    (row.updatedAt === undefined || typeof row.updatedAt === 'string')
  )
}

/** The position a sync file carries, read as untrusted input. */
function positionInFile(text: string): ProgramPosition | undefined {
  try {
    const parsed: unknown = JSON.parse(text)
    const position = (parsed as { readonly position?: unknown } | null)?.position
    return isPosition(position) ? position : undefined
  } catch {
    return undefined
  }
}

/** True when `theirs` moved later than `ours`. An unstamped one never wins. */
export function isNewerPosition(
  theirs: ProgramPosition,
  ours: ProgramPosition | undefined,
): boolean {
  if (theirs.updatedAt === undefined) return false
  return ours === undefined || theirs.updatedAt > (ours.updatedAt ?? '')
}

/**
 * The calendar ahead travels beside the position for the same reason, and
 * one more: it is written for readers that are not LiftOS (Jarvis shows
 * today's session from it). Never read back — each device derives its own.
 */
interface SyncOptions extends ExportOptions {
  readonly upcoming?: readonly UpcomingSession[]
  /**
   * The SBD total as this app computes it, and which sessions were
   * deloads, for readers of the file (Jarvis). Derived, never read back.
   */
  readonly strength?: SyncStrength
}

export interface SyncStrength {
  readonly total: number | null
  readonly lifts: readonly {
    readonly lift: string
    readonly exerciseId: string
    readonly max: number | null
    readonly measuredOn: string | null
  }[]
  readonly deloadWorkoutIds: readonly string[]
}

function strengthInFile(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text)
    return (parsed as { readonly strength?: unknown } | null)?.strength
  } catch {
    return undefined
  }
}

/** The `upcoming` a sync file carries, unread: it is only compared and passed on. */
function upcomingInFile(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text)
    return (parsed as { readonly upcoming?: unknown } | null)?.upcoming
  } catch {
    return undefined
  }
}

export async function syncWithGitHub(
  target: GitHubTarget,
  repositories: SyncRepositories,
  options: SyncOptions,
  fetchFn: typeof fetch = fetch,
): Promise<SyncRun> {
  let pulled = 0
  let purged = 0
  const inboxed = await applyInbox(target, repositories, fetchFn)

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const remote = await readFile(target, fetchFn)

    let remoteFingerprint: string | undefined
    let remotePosition: ProgramPosition | undefined
    let remoteUpcoming: unknown
    let remoteStrength: unknown
    if (remote !== undefined) {
      const parsed = parseBackup(remote.text)
      if (parsed.envelope === undefined) {
        /*
         * Refused rather than overwritten. A file that fails its checksum
         * is most likely a truncated write, and replacing it with this
         * device's copy would quietly discard whatever the other device
         * had that this one does not.
         */
        throw new GitHubSyncError(
          'unexpected',
          'The file in the repository is not a readable backup, so nothing was overwritten.',
        )
      }
      const merged = await mergeNewer(parsed.envelope, repositories)
      pulled += merged.pulled
      purged += merged.purged
      remoteFingerprint = recordsFingerprint(parsed.envelope.data)

      remotePosition = positionInFile(remote.text)
      remoteUpcoming = upcomingInFile(remote.text)
      remoteStrength = strengthInFile(remote.text)
      if (repositories.position !== undefined && remotePosition !== undefined) {
        if (isNewerPosition(remotePosition, await repositories.position.get())) {
          await repositories.position.restore(remotePosition)
          pulled += 1
        }
      }
    }

    // A device that could not derive the calendar carries the file's along.
    const { upcoming: derived, strength: derivedStrength, ...exportOptions } = options
    const upcoming: unknown = derived ?? remoteUpcoming
    const strength: unknown = derivedStrength ?? remoteStrength
    const local = await buildBackup(repositories, exportOptions)
    const localPosition = await repositories.position?.get()
    const samePosition = (localPosition?.updatedAt ?? '') === (remotePosition?.updatedAt ?? '')
    const sameUpcoming = JSON.stringify(upcoming) === JSON.stringify(remoteUpcoming)
    const sameStrength = JSON.stringify(strength) === JSON.stringify(remoteStrength)
    if (
      remoteFingerprint === recordsFingerprint(local.data) &&
      samePosition &&
      sameUpcoming &&
      sameStrength
    ) {
      return { pulled, purged, uploaded: false, inboxed }
    }

    const extras = {
      ...(localPosition === undefined ? {} : { position: localPosition }),
      ...(upcoming === undefined ? {} : { upcoming }),
      ...(strength === undefined ? {} : { strength }),
    }
    const body =
      Object.keys(extras).length === 0
        ? serialiseBackup(local)
        : JSON.stringify({ ...local, ...extras }, null, 2)

    const outcome = await writeFile(
      target,
      body,
      remote?.sha,
      `LiftOS sync, ${options.now.toISOString()}`,
      fetchFn,
    )
    if (outcome === 'written') return { pulled, purged, uploaded: true, inboxed }
  }

  throw new GitHubSyncError(
    'unexpected',
    'The other device kept writing at the same time. Try again.',
  )
}
