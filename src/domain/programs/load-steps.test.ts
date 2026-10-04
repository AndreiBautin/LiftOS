import { describe, expect, it } from 'vitest'

import { builtInExercises } from '@/domain/exercises/catalogue'

import { stepFor } from './progression'
import { defaultStepFor, smallerStep, stepJump, withLoadSteps } from './load-steps'

const library = builtInExercises()
const raise = library.find((one) => one.id === 'db-lateral-raise')

describe('a step too big for the bar', () => {
  it('reads the next step as a share of the load', () => {
    expect(stepJump(20, 5)).toBe(0.25)
    expect(stepJump(225, 5)).toBeCloseTo(0.022)
    expect(stepJump(undefined, 5)).toBeUndefined()
    expect(stepJump(0, 5)).toBeUndefined()
  })

  it('halves a step, never below the smallest plate', () => {
    expect(smallerStep(5)).toBe(2.5)
    expect(smallerStep(10)).toBe(5)
    expect(smallerStep(2)).toBe(1.25)
  })

  /* The override reaches stepFor through the library, so every reader sees it. */
  it('applies a chosen step to its exercise and nothing else', () => {
    const stepped = withLoadSteps(library, { 'db-lateral-raise': 2.5, 'bench-press': 0 })
    const after = stepped.find((one) => one.id === 'db-lateral-raise')
    expect(after && stepFor(after)).toBe(2.5)
    expect(after && defaultStepFor(after)).toBe(5)
    const bench = stepped.find((one) => one.id === 'bench-press')
    expect(bench?.loadStep).toBeUndefined()
    expect(raise?.loadStep).toBeUndefined()
  })
})
