import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'

import { glyphFor, GLYPHS } from './glyph-for'
import { GLYPH_PATHS } from './glyph-paths'

describe('the picture for an exercise', () => {
  it('draws the compounds by their movement', () => {
    expect(glyphFor({ pattern: 'squat', primaryMuscle: 'quads' })).toBe('squat')
    expect(glyphFor({ pattern: 'vertical-pull', primaryMuscle: 'lats' })).toBe('pullup')
  })

  it('tells isolation work apart by the muscle', () => {
    expect(glyphFor({ pattern: 'isolation', primaryMuscle: 'biceps' })).toBe('curl')
    expect(glyphFor({ pattern: 'isolation', primaryMuscle: 'side-delts' })).toBe('raise')
    expect(glyphFor({ pattern: 'isolation', primaryMuscle: 'calves' })).toBe('calf')
  })

  it('draws a warm-up as a warm-up whatever it moves', () => {
    expect(glyphFor({ pattern: 'squat', primaryMuscle: 'quads', warmup: true })).toBe('warmup')
    expect(glyphFor({ id: 'roll-quads', pattern: 'conditioning', primaryMuscle: 'quads' })).toBe(
      'warmup',
    )
  })

  /* A glyph named and never drawn would render an empty square. */
  it('has a drawing for every glyph it can name', () => {
    for (const glyph of GLYPHS) expect(GLYPH_PATHS[glyph].length).toBeGreaterThan(0)
  })

  /* `lift` is the fallback; the shipped catalogue should rarely need it. */
  it('names a specific picture for most of the catalogue', () => {
    const all = builtInExercises()
    const plain = all.filter((one) => glyphFor(one) === 'lift')
    expect(plain.length).toBeLessThanOrEqual(all.length / 10)
  })
})
