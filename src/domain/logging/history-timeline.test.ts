import { describe, expect, it } from 'vitest'

import { aWorkout } from '@/test/builders/workout'

import { historyTimeline } from './history-timeline'

const on = (date: string) => aWorkout({ date })

describe('history as a timeline', () => {
  it('cuts newest-first sessions into months without reordering them', () => {
    const logs = [on('2026-11-03'), on('2026-11-01'), on('2026-10-30')]
    const months = historyTimeline(logs, { withBreaks: true })
    expect(months.map((one) => one.month)).toEqual(['2026-11', '2026-10'])
    expect(months[0]?.sessions.map((one) => one.log.date)).toEqual(['2026-11-03', '2026-11-01'])
  })

  it('says a break on the session after it, in whole weeks', () => {
    const months = historyTimeline([on('2026-11-03'), on('2026-10-06')], { withBreaks: true })
    expect(months[0]?.sessions[0]?.weeksOffBefore).toBe(4)
    expect(months[1]?.sessions[0]?.weeksOffBefore).toBeUndefined()
  })

  /* A normal week apart is no break: a line per week would be the whole list. */
  it('stays quiet about an ordinary week', () => {
    const months = historyTimeline([on('2026-11-03'), on('2026-10-27')], { withBreaks: true })
    expect(months.flatMap((one) => one.sessions).some((one) => one.weeksOffBefore)).toBe(false)
  })

  /* Search results skip sessions, and every skip would otherwise read as time off. */
  it('claims no break between search results', () => {
    const months = historyTimeline([on('2026-11-03'), on('2026-06-01')], { withBreaks: false })
    expect(months.flatMap((one) => one.sessions).some((one) => one.weeksOffBefore)).toBe(false)
  })
})
