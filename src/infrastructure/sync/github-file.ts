/**
 * One file in one private GitHub repository, read and written through the
 * REST API's contents endpoint.
 *
 * **The whole transport, and deliberately nothing more.** GitHub is where
 * the code and the deploy already live, the API is free with no card,
 * and a fine-grained token can be scoped to this one repository with
 * contents read/write and nothing else — so the worst case of the token
 * leaking is the data it already guards.
 *
 * Every request is `cache: 'no-store'`. The API sends `max-age=60`, and a
 * read served from the browser's cache would hand back the file as it
 * was a minute ago — a sync that then writes against that stale `sha` is
 * refused, and one that merges the stale copy has simply missed the
 * other device's last change.
 */
export interface GitHubTarget {
  readonly owner: string
  readonly repo: string
  readonly path: string
  readonly token: string
}

interface RemoteFile {
  readonly text: string
  /** The blob id the next write must name, so it cannot clobber a newer one. */
  readonly sha: string
}

type WriteOutcome = 'written' | 'conflict'

/** A failure the Settings screen can put into words. */
type GitHubSyncReason = 'unauthorised' | 'not-found' | 'rate-limited' | 'network' | 'unexpected'

export class GitHubSyncError extends Error {
  readonly reason: GitHubSyncReason

  constructor(reason: GitHubSyncReason, message: string) {
    super(message)
    this.name = 'GitHubSyncError'
    this.reason = reason
  }
}

type Fetch = typeof fetch

/**
 * The largest sync file read, in characters. A year of training is well
 * under a megabyte; the raw route would hand back up to 100 MB, and a
 * file that size is a mistake or an attack, not a training log — refused
 * before it is parsed rather than after it has filled the tab's memory.
 */
export const MAX_SYNC_FILE_CHARS = 20 * 1024 * 1024

const NAME = /^[A-Za-z0-9_.-]+$/

/**
 * **Every part of the address is checked before a token is sent with it.**
 * Encoding a segment does not neutralise `..`: the URL parser resolves dot
 * segments, so `../../user` in the file path walked out of `/contents/`
 * to other GitHub endpoints carrying the token. Owner and repository are
 * GitHub's own name characters; the path is plain segments, none empty,
 * none a dot.
 */
export function checkTarget(target: GitHubTarget): void {
  const named = (value: string): boolean => NAME.test(value) && value !== '.' && value !== '..'
  if (!named(target.owner) || !named(target.repo)) {
    throw new GitHubSyncError('unexpected', 'The account or repository name is not valid.')
  }
  const segments = target.path.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new GitHubSyncError('unexpected', 'The file path is not valid.')
  }
}

function urlOf(target: GitHubTarget): string {
  checkTarget(target)
  const path = target.path.split('/').map(encodeURIComponent).join('/')
  return `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${path}`
}

function headers(target: GitHubTarget, accept: string): Record<string, string> {
  return {
    Accept: accept,
    Authorization: `Bearer ${target.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function failureFor(status: number): GitHubSyncError {
  if (status === 401) return new GitHubSyncError('unauthorised', 'The token was refused.')
  if (status === 403 || status === 429)
    return new GitHubSyncError(
      'rate-limited',
      'GitHub refused the request — rate limit or token scope.',
    )
  if (status === 404)
    return new GitHubSyncError('not-found', 'Repository not found, or the token cannot see it.')
  return new GitHubSyncError('unexpected', `GitHub answered ${String(status)}.`)
}

async function send(fetchFn: Fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchFn(url, { ...init, cache: 'no-store' })
  } catch {
    throw new GitHubSyncError('network', 'Could not reach GitHub.')
  }
}

/** UTF-8 safe, and chunked so a large file does not overflow the call stack. */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const CHUNK = 0x8000
  for (let at = 0; at < bytes.length; at += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK))
  }
  return btoa(binary)
}

export function fromBase64(encoded: string): string {
  const binary = atob(encoded.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** The file, or `undefined` when it does not exist yet — the first sync. */
export async function readFile(
  target: GitHubTarget,
  fetchFn: Fetch = fetch,
): Promise<RemoteFile | undefined> {
  const response = await send(fetchFn, urlOf(target), {
    headers: headers(target, 'application/vnd.github+json'),
  })
  if (response.status === 404) {
    // Either the file or the repository is missing; the write that follows
    // tells them apart, because creating a file in a missing repo fails.
    return undefined
  }
  if (!response.ok) throw failureFor(response.status)

  const body = (await response.json()) as unknown
  if (typeof body !== 'object' || body === null || !('sha' in body)) {
    throw new GitHubSyncError('unexpected', 'That path is not a file.')
  }
  const { sha, content, encoding } = body as Record<string, unknown>
  if (typeof sha !== 'string') throw new GitHubSyncError('unexpected', 'That path is not a file.')

  if (encoding === 'base64' && typeof content === 'string' && content !== '') {
    return { text: bounded(fromBase64(content)), sha }
  }

  /*
   * Over a megabyte the JSON response carries no content, only the sha.
   * The raw media type returns the bytes themselves, up to 100 MB.
   */
  const raw = await send(fetchFn, urlOf(target), {
    headers: headers(target, 'application/vnd.github.raw+json'),
  })
  if (!raw.ok) throw failureFor(raw.status)
  const declared = Number(raw.headers.get('Content-Length') ?? '0')
  if (declared > MAX_SYNC_FILE_CHARS) throw tooLarge()
  return { text: bounded(await raw.text()), sha }
}

function tooLarge(): GitHubSyncError {
  return new GitHubSyncError('unexpected', 'The sync file is too large to be a training log.')
}

function bounded(text: string): string {
  if (text.length > MAX_SYNC_FILE_CHARS) throw tooLarge()
  return text
}

/**
 * Writes the file, naming the version it replaces.
 *
 * A `conflict` means the other device wrote in between this device's
 * read and its write; the caller reads again and re-merges rather than
 * overwriting what it never saw.
 */
export async function writeFile(
  target: GitHubTarget,
  text: string,
  sha: string | undefined,
  message: string,
  fetchFn: Fetch = fetch,
): Promise<WriteOutcome> {
  const response = await send(fetchFn, urlOf(target), {
    method: 'PUT',
    headers: {
      ...headers(target, 'application/vnd.github+json'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: toBase64(text),
      ...(sha === undefined ? {} : { sha }),
    }),
  })
  if (response.ok) return 'written'
  if (response.status === 409 || response.status === 422) return 'conflict'
  throw failureFor(response.status)
}

/**
 * Which kind of GitHub token this is, read off its published prefix.
 *
 * A fine-grained token (`github_pat_`) can be limited to one repository
 * and one permission, which is all sync needs. A classic one (`ghp_`)
 * carries scopes across every repository the account can reach — and it
 * sits in this browser's storage, so whatever it can reach is what a
 * leak would cost. The connect form says so rather than refusing: the
 * account is the lifter's, and so is the decision.
 */
type TokenKind = 'fine-grained' | 'classic' | 'unknown'

export function tokenKind(token: string): TokenKind {
  const trimmed = token.trim()
  if (trimmed.startsWith('github_pat_')) return 'fine-grained'
  if (/^gh[pousr]_/.test(trimmed)) return 'classic'
  return 'unknown'
}
