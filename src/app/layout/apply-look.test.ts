import { afterEach, describe, expect, it } from 'vitest'

import { applyLook } from './apply-look'

function themeColour(): string | null {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null
}

describe('applyLook', () => {
  afterEach(() => {
    delete document.documentElement.dataset.look
    delete document.documentElement.dataset.black
    document.head.innerHTML = ''
  })

  it('marks the root for the terminal look and tints the status bar to its ground', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#0a0c0d">'
    applyLook(document.documentElement, 'terminal', false)
    expect(document.documentElement.dataset.look).toBe('terminal')
    expect(themeColour()).toBe('#000804')
  })

  it('leaves no attribute for classic, so classic draws as it always did', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000804">'
    document.documentElement.dataset.look = 'terminal'
    applyLook(document.documentElement, 'classic', false)
    expect(document.documentElement.hasAttribute('data-look')).toBe(false)
    expect(document.documentElement.hasAttribute('data-black')).toBe(false)
    expect(themeColour()).toBe('#0a0c0d')
  })

  it('applies pure black under classic only', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#0a0c0d">'
    applyLook(document.documentElement, 'classic', true)
    expect(document.documentElement.hasAttribute('data-black')).toBe(true)
    expect(themeColour()).toBe('#000000')
    applyLook(document.documentElement, 'terminal', true)
    expect(document.documentElement.hasAttribute('data-black')).toBe(false)
  })
})
