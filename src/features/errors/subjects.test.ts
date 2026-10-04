import { describe, expect, it } from 'vitest'

import { failureSubjects, joinSubjects } from './subjects'

describe('what a failed read was about', () => {
  it('names each subject once, in the order they failed', () => {
    expect(
      failureSubjects([
        ['workouts', 'recent', 500],
        ['program', {}],
        ['workouts', 'week'],
      ]),
    ).toEqual(['your sessions', 'the programme'])
  })

  it('reads an unknown key as some of your data, never as its internal name', () => {
    expect(failureSubjects([['metrics'], [42]])).toEqual(['some of your data'])
  })

  it('joins them as a sentence would', () => {
    expect(joinSubjects(['a'])).toBe('a')
    expect(joinSubjects(['a', 'b'])).toBe('a and b')
    expect(joinSubjects(['a', 'b', 'c'])).toBe('a, b and c')
  })
})
