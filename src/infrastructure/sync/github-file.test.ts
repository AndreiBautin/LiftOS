import { describe, expect, it } from 'vitest'

import {
  checkTarget,
  GitHubSyncError,
  MAX_SYNC_FILE_CHARS,
  readFile,
  toBase64,
} from './github-file'

const target = {
  owner: 'someone',
  repo: 'training-data',
  path: 'lifeos-sync.json',
  token: 'github_pat_test',
}

/** A fetch that records every URL it was asked for and answers with `body`. */
function answering(body: unknown, init: ResponseInit = { status: 200 }) {
  const asked: string[] = []
  const fetchFn = ((url: string) => {
    asked.push(url)
    return Promise.resolve(new Response(JSON.stringify(body), init))
  }) as typeof fetch
  return { asked, fetchFn }
}

/*
 * The token goes with every request, so the address it goes to is the
 * thing to get right. Encoding a segment leaves `..` intact, and the URL
 * parser then resolves it — out of `/contents/` and onto another endpoint.
 */
describe('the address a token is sent to', () => {
  it.each([
    ['a dot-dot in the path', { path: '../../user' }],
    ['a dot-dot further in', { path: 'data/../../../user/repos' }],
    ['an empty segment', { path: 'data//file.json' }],
    ['a leading slash', { path: '/lifeos-sync.json' }],
    ['a slash in the owner', { owner: 'someone/other' }],
    ['a dot-dot repository', { repo: '..' }],
    ['a query in the repository', { repo: 'data?x=1' }],
  ])('refuses %s', async (_label, change) => {
    const { asked, fetchFn } = answering({})
    expect(() => {
      checkTarget({ ...target, ...change })
    }).toThrow(GitHubSyncError)
    await expect(readFile({ ...target, ...change }, fetchFn)).rejects.toThrow(GitHubSyncError)
    expect(asked).toEqual([])
  })

  it('accepts a nested path and asks for exactly it', async () => {
    const { asked, fetchFn } = answering({
      sha: 'abc',
      encoding: 'base64',
      content: toBase64('{}'),
    })
    await readFile({ ...target, path: 'logs/lifeos-sync.json' }, fetchFn)
    expect(asked).toEqual([
      'https://api.github.com/repos/someone/training-data/contents/logs/lifeos-sync.json',
    ])
  })
})

/* The file comes back from a repository anyone with write access can edit. */
describe('reading the sync file as untrusted', () => {
  it('refuses a response whose sha is not a string', async () => {
    const { fetchFn } = answering({ sha: 42, encoding: 'base64', content: toBase64('{}') })
    await expect(readFile(target, fetchFn)).rejects.toThrow('not a file')
  })

  /* Over a megabyte GitHub sends only the sha, and the bytes come raw. */
  it('refuses a file larger than any training log before reading it', async () => {
    let call = 0
    const fetchFn = (() => {
      call += 1
      return Promise.resolve(
        call === 1
          ? new Response(JSON.stringify({ sha: 'abc' }))
          : new Response('{}', {
              headers: { 'Content-Length': String(MAX_SYNC_FILE_CHARS + 1) },
            }),
      )
    }) as typeof fetch
    await expect(readFile(target, fetchFn)).rejects.toThrow('too large')
  })
})
