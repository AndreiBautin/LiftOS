/**
 * Adds what was spoken to what was typed: a space between, the first
 * letter of a new note capitalised, and **cut at the field's own limit on
 * a word boundary** rather than mid-word — a note that ends "felt stro"
 * reads as a typo nobody made.
 */
export function appendDictation(current: string, spoken: string, limit: number): string {
  const said = spoken.trim().replace(/\s+/g, ' ')
  if (said === '') return current
  const before = current.trimEnd()
  const joined = before === '' ? said.charAt(0).toUpperCase() + said.slice(1) : `${before} ${said}`
  if (joined.length <= limit) return joined
  const cut = joined.slice(0, limit)
  const space = cut.lastIndexOf(' ')
  return space > before.length ? cut.slice(0, space) : cut
}

/** The browser's speech recogniser, where there is one. */
export interface Recogniser {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}

export function recogniserConstructor(): (new () => Recogniser) | undefined {
  if (typeof window === 'undefined') return undefined
  const scope = window as unknown as {
    SpeechRecognition?: new () => Recogniser
    webkitSpeechRecognition?: new () => Recogniser
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}
