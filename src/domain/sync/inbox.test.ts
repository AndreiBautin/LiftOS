import { describe, expect, it } from 'vitest'

import { parseActivity, type ActivityEntry } from '@/domain/logging/activity'
import { indexTombstones } from '@/domain/sync/tombstone'

import { inboxPathFor, parseInbox, planInbox, type InboxOp } from './inbox'

const activity = {
  id: 'evt-000001',
  day: '2026-11-21',
  exercise: 'Lateral raises',
  amount: { kind: 'total', reps: 100, per: 'total' },
  source: 'jarvis',
  createdAt: '2026-11-21T18:00:00.000Z',
  updatedAt: '2026-11-21T18:00:00.000Z',
}
const edited = {
  ...activity,
  amount: { kind: 'total', reps: 80, per: 'total' },
  updatedAt: '2026-11-21T19:00:00.000Z',
}
const undo = { op: 'delete', id: activity.id, deletedAt: '2026-11-21T20:00:00.000Z' }

const inbox = (ops: unknown[]): string => JSON.stringify({ magic: 'liftos.inbox', version: 1, ops })
const opsOf = (ops: unknown[]): readonly InboxOp[] => parseInbox(inbox(ops))?.ops ?? []
const none = indexTombstones([])
const entry = (row: unknown): ActivityEntry => {
  const parsed = parseActivity(row)
  if (parsed === undefined) throw new Error('fixture')
  return parsed
}
const held = (row: unknown): ReadonlyMap<string, ActivityEntry> =>
  new Map([[activity.id, entry(row)]])

describe('the inbox', () => {
  it('lives beside the sync file', () => {
    expect(inboxPathFor('lifeos-sync.json')).toBe('liftos-inbox.json')
    expect(inboxPathFor('data/lifeos-sync.json')).toBe('data/liftos-inbox.json')
  })

  it('is not an inbox without its magic', () => {
    expect(parseInbox('{"ops":[]}')).toBeUndefined()
    expect(parseInbox('not json')).toBeUndefined()
  })

  it('keeps valid operations and counts the rest', () => {
    const parsed = parseInbox(
      inbox([{ op: 'put', activity }, { op: 'put', activity: { ...activity, source: 'app' } }, 7]),
    )
    expect(parsed?.ops).toHaveLength(1)
    expect(parsed?.refused).toBe(2)
  })

  it('files a new activity once, and a second read changes nothing', () => {
    const ops = opsOf([{ op: 'put', activity }])
    expect(planInbox(ops, new Map(), none).put.map((row) => row.id)).toEqual(['evt-000001'])
    expect(planInbox(ops, held(activity), none)).toEqual({ put: [], bury: [], purge: [] })
  })

  it('lets a newer edit replace an older one but never the reverse', () => {
    expect(
      planInbox(opsOf([{ op: 'put', activity: edited }]), held(activity), none).put,
    ).toHaveLength(1)
    expect(planInbox(opsOf([{ op: 'put', activity }]), held(edited), none).put).toHaveLength(0)
  })

  it('turns an undo into a tombstone and purges the row', () => {
    const plan = planInbox(opsOf([undo]), held(activity), none)
    expect(plan.bury).toEqual([{ id: activity.id, deletedAt: undo.deletedAt }])
    expect(plan.purge).toEqual([activity.id])
  })

  it('never resurrects a record deleted later than the put', () => {
    const tombstones = indexTombstones([
      { id: activity.id, collection: 'activities', deletedAt: undo.deletedAt },
    ])
    expect(planInbox(opsOf([{ op: 'put', activity }]), new Map(), tombstones).put).toHaveLength(0)
  })

  it('applies operations in order: put then delete ends deleted', () => {
    const plan = planInbox(opsOf([{ op: 'put', activity }, undo]), new Map(), none)
    expect(plan.put).toHaveLength(0)
    expect(plan.bury).toHaveLength(1)
    expect(plan.purge).toHaveLength(0)
  })
})
