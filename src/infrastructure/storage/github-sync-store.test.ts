import { describe, expect, it } from 'vitest'

import {
  clearGitHubSync,
  DEFAULT_SYNC_PATH,
  readGitHubSync,
  saveGitHubSync,
} from './github-sync-store'

/** A Storage that holds strings, or throws on every call when `broken`. */
function memoryStorage(broken = false): Storage {
  const held = new Map<string, string>()
  const refuse = (): never => {
    throw new DOMException('denied', 'SecurityError')
  }
  return {
    get length() {
      return held.size
    },
    clear: () => {
      held.clear()
    },
    getItem: (key) => (broken ? refuse() : (held.get(key) ?? null)),
    key: (index) => [...held.keys()][index] ?? null,
    removeItem: (key) => (broken ? refuse() : void held.delete(key)),
    setItem: (key, value) => (broken ? refuse() : void held.set(key, value)),
  }
}

const KEY = 'test.github-sync'
const config = {
  owner: 'someone',
  repo: 'training-data',
  path: 'logs/a.json',
  token: 'github_pat_x',
}

/*
 * What is stored here decides where the token is sent, and it is read
 * back from storage anything on the origin could have written. A shape
 * that half-parses would sync somewhere nobody chose; every bad shape
 * reads as "not connected" instead.
 */
describe('the stored sync connection', () => {
  it('reads back what was saved, with when it last synced', () => {
    const storage = memoryStorage()
    saveGitHubSync(KEY, { ...config, lastSyncedAt: '2026-10-14T09:00:00Z' }, storage)
    expect(readGitHubSync(KEY, storage)).toEqual({
      ...config,
      lastSyncedAt: '2026-10-14T09:00:00Z',
    })
  })

  it('falls back to the default file when the path is missing or empty', () => {
    const storage = memoryStorage()
    storage.setItem(KEY, JSON.stringify({ ...config, path: '' }))
    expect(readGitHubSync(KEY, storage)?.path).toBe(DEFAULT_SYNC_PATH)
  })

  it.each([
    ['nothing stored', undefined],
    ['text that is not JSON', 'not json'],
    ['JSON that is not an object', '"a string"'],
    ['no token', JSON.stringify({ owner: 'a', repo: 'b' })],
    ['an empty token', JSON.stringify({ ...config, token: '' })],
    ['a token that is not text', JSON.stringify({ ...config, token: 42 })],
    ['an empty owner', JSON.stringify({ ...config, owner: '' })],
  ])('reads %s as not connected', (_label, stored) => {
    const storage = memoryStorage()
    if (stored !== undefined) storage.setItem(KEY, stored)
    expect(readGitHubSync(KEY, storage)).toBeUndefined()
  })

  it('drops a lastSyncedAt that is not text rather than trusting it', () => {
    const storage = memoryStorage()
    storage.setItem(KEY, JSON.stringify({ ...config, lastSyncedAt: 5 }))
    expect(readGitHubSync(KEY, storage)).toEqual(config)
  })

  it('treats refused storage as not connected, and never throws', () => {
    const storage = memoryStorage(true)
    expect(readGitHubSync(KEY, storage)).toBeUndefined()
    expect(() => {
      saveGitHubSync(KEY, config, storage)
      clearGitHubSync(KEY, storage)
    }).not.toThrow()
  })

  it('forgets the connection when cleared', () => {
    const storage = memoryStorage()
    saveGitHubSync(KEY, config, storage)
    clearGitHubSync(KEY, storage)
    expect(readGitHubSync(KEY, storage)).toBeUndefined()
  })
})
