import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const terminalSheet = readFileSync('src/look-terminal.css', 'utf8')
const classicSheet = readFileSync('src/index.css', 'utf8')

/**
 * The terminal look is one root attribute, so classic is drawn exactly as
 * before only while every rule in its sheet waits for that attribute. A rule
 * that forgot the scope would repaint classic silently; this is what notices.
 * Read from disk (typed by `tsconfig.node.json`), because Vitest hands a CSS
 * import back empty.
 */
const sheet = terminalSheet.replace(/\/\*[\s\S]*?\*\//g, '')
const blocks = [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
  selector: (match[1] ?? '').trim(),
  body: match[2] ?? '',
}))

describe('the terminal look sheet', () => {
  it('has rules', () => {
    expect(blocks.length).toBeGreaterThan(5)
  })

  it('scopes every selector to the terminal root', () => {
    for (const { selector } of blocks) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        expect(part.trim(), selector).toMatch(/^:root\[data-look='terminal'\]/)
      }
    }
  })

  it('writes hex colours only in the token block', () => {
    for (const { selector, body } of blocks) {
      if (selector === ":root[data-look='terminal']") continue
      expect(body, selector).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    }
  })

  it('adds no animation or transition', () => {
    expect(sheet).not.toMatch(/@keyframes|animation\s*:|transition\s*:/)
  })
})

describe('the classic sheet', () => {
  it('never names the terminal look', () => {
    expect(classicSheet).not.toMatch(/data-look/)
  })
})
