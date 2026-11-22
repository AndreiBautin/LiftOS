import { deleteDB } from 'idb'
import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/settings/settings'
import { closeAppDatabase, openDatabase } from '@/infrastructure/db/database'
import {
  createActivityRepository,
  createCheckInRepository,
  createExerciseRepository,
  createTombstoneRepository,
  createWorkoutRepository,
} from '@/infrastructure/db/repositories'

import { fromBase64, toBase64, type GitHubTarget } from './github-file'
import { syncWithGitHub, type SyncRepositories } from './github-sync'

/**
 * Jarvis's inbox, end to end through one sync round: the phone files what
 * the inbox holds, and the same round's write carries it into the sync
 * file, which is the readback Jarvis's receipt waits for.
 */
function repo(files: Record<string, string>) {
  const sha = new Map<string, number>()
  const fetchFn = ((url: string, init?: RequestInit) => {
    const path = decodeURIComponent(url.split('/contents/')[1] ?? '')
    if (init?.method === 'PUT') {
      const body = JSON.parse(init.body as string) as { content: string }
      files[path] = fromBase64(body.content)
      sha.set(path, (sha.get(path) ?? 0) + 1)
      return Promise.resolve(new Response('{}', { status: 200 }))
    }
    const text = files[path]
    if (text === undefined) return Promise.resolve(new Response('', { status: 404 }))
    return Promise.resolve(
      new Response(
        JSON.stringify({
          sha: `sha-${String(sha.get(path) ?? 0)}`,
          content: toBase64(text),
          encoding: 'base64',
        }),
        { status: 200 },
      ),
    )
  }) as typeof fetch
  return { fetchFn, files }
}

const target: GitHubTarget = { owner: 'me', repo: 'data', path: 'lifeos-sync.json', token: 't' }
const clock = { now: () => new Date('2026-11-21T21:00:00.000Z') }
const options = { settings: DEFAULT_SETTINGS, appVersion: 'test', now: clock.now() }
const opened: string[] = []

async function device(name: string): Promise<SyncRepositories> {
  opened.push(name)
  const db = await openDatabase(name)
  return {
    exercises: createExerciseRepository(db),
    workouts: createWorkoutRepository(db, clock),
    checkIns: createCheckInRepository(db),
    activities: createActivityRepository(db, clock),
    tombstones: createTombstoneRepository(db),
  }
}

afterEach(async () => {
  await closeAppDatabase()
  for (const name of opened.splice(0)) await deleteDB(name)
})

const put = {
  op: 'put',
  activity: {
    id: 'jarvis-evt-0001',
    day: '2026-11-21',
    exercise: 'Push-ups',
    amount: { kind: 'total', reps: 60, per: 'total' },
    source: 'jarvis',
    createdAt: '2026-11-21T20:00:00.000Z',
    updatedAt: '2026-11-21T20:00:00.000Z',
  },
}
const inbox = (ops: unknown[]): string => JSON.stringify({ magic: 'liftos.inbox', version: 1, ops })

describe("Jarvis's inbox", () => {
  it('is filed and carried into the sync file in the same round', async () => {
    const github = repo({ 'liftos-inbox.json': inbox([put]) })
    const phone = await device('inbox-phone')

    const run = await syncWithGitHub(target, phone, options, github.fetchFn)

    expect(run.inboxed).toBe(1)
    expect(run.uploaded).toBe(true)
    expect((await phone.activities.byId(put.activity.id as never))?.exercise).toBe('Push-ups')
    const synced = JSON.parse(github.files['lifeos-sync.json'] ?? '{}') as {
      data: { activities: { id: string }[] }
      schemaVersion: number
    }
    expect(synced.schemaVersion).toBe(4)
    expect(synced.data.activities.map((row) => row.id)).toEqual([put.activity.id])
  })

  it('never writes the inbox, and a second round files nothing twice', async () => {
    const github = repo({ 'liftos-inbox.json': inbox([put]) })
    const phone = await device('inbox-idempotent')
    await syncWithGitHub(target, phone, options, github.fetchFn)
    const before = github.files['liftos-inbox.json']

    const again = await syncWithGitHub(target, phone, options, github.fetchFn)

    expect(again.inboxed).toBe(0)
    expect(again.uploaded).toBe(false)
    expect(github.files['liftos-inbox.json']).toBe(before)
    expect(await phone.activities.all()).toHaveLength(1)
  })

  it('an undo in the inbox removes the record here and from the sync file', async () => {
    const github = repo({ 'liftos-inbox.json': inbox([put]) })
    const phone = await device('inbox-undo')
    await syncWithGitHub(target, phone, options, github.fetchFn)

    github.files['liftos-inbox.json'] = inbox([
      put,
      { op: 'delete', id: put.activity.id, deletedAt: '2026-11-21T20:30:00.000Z' },
    ])
    await syncWithGitHub(target, phone, options, github.fetchFn)

    expect(await phone.activities.all()).toHaveLength(0)
    const synced = JSON.parse(github.files['lifeos-sync.json'] ?? '{}') as {
      data: { activities: unknown[]; tombstones: { id: string }[] }
    }
    expect(synced.data.activities).toHaveLength(0)
    expect(synced.data.tombstones.map((one) => one.id)).toContain(put.activity.id)
  })

  it('a malformed inbox never stops the sync', async () => {
    const github = repo({ 'liftos-inbox.json': '{"not":"an inbox"}' })
    const phone = await device('inbox-malformed')
    const run = await syncWithGitHub(target, phone, options, github.fetchFn)
    expect(run.inboxed).toBe(0)
    expect(run.uploaded).toBe(true)
  })
})
