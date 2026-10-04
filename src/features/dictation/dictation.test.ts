import { describe, expect, it } from 'vitest'

import { appendDictation } from './dictation'

describe('adding a dictated note', () => {
  it('starts a new note with a capital, and joins an old one with a space', () => {
    expect(appendDictation('', 'felt strong today', 80)).toBe('Felt strong today')
    expect(appendDictation('Belt on', '  left knee   ok ', 80)).toBe('Belt on left knee ok')
  })

  it('leaves the note alone when nothing was heard', () => {
    expect(appendDictation('Belt on', '   ', 80)).toBe('Belt on')
  })

  /* A note that ends "felt stro" reads as a typo nobody made. */
  it('cuts at the limit on a word boundary', () => {
    expect(appendDictation('Grip', 'slipped on the last rep again', 20)).toBe('Grip slipped on the')
  })
})
