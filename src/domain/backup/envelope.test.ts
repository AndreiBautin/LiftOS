import { describe, expect, it } from 'vitest'

import { BACKUP_MAGIC, BACKUP_SCHEMA_VERSION, validateEnvelope } from './envelope'

/*
 * What a person reads when they pick the wrong file. Every refusal here
 * is a sentence on the import screen, and a wrong one either lets a bad
 * file through or blames a good one; the round trips in
 * backup-service.test.ts cover the files that work.
 */
const sections = { exercises: [], workouts: [], checkIns: [], settings: {} }
const file = (overrides: Record<string, unknown> = {}) => ({
  magic: BACKUP_MAGIC,
  schemaVersion: BACKUP_SCHEMA_VERSION,
  data: sections,
  ...overrides,
})
const messages = (candidate: unknown) =>
  validateEnvelope(candidate)
    .problems.map((one) => one.message)
    .join(' ')

describe('a file that is not a backup', () => {
  it.each([null, 'text', 42])('refuses %j as not JSON it can read', (candidate) => {
    expect(validateEnvelope(candidate).valid).toBe(false)
    expect(messages(candidate)).toMatch(/not valid JSON/)
  })

  it('refuses a JSON file without the backup’s marker', () => {
    expect(messages({ ...file(), magic: 'something-else' })).toMatch(/does not look like/)
  })

  it('refuses a backup with no schema version', () => {
    const { schemaVersion: _gone, ...rest } = file()
    expect(messages(rest)).toMatch(/schema version/)
  })

  it('refuses a backup from a newer app, and says to update', () => {
    const preview = validateEnvelope(file({ schemaVersion: BACKUP_SCHEMA_VERSION + 1 }))
    expect(preview.valid).toBe(false)
    expect(preview.problems[0]?.message).toMatch(/newer version/)
  })

  it('refuses a backup with no data section', () => {
    expect(messages(file({ data: null }))).toMatch(/no data section/)
  })

  it('refuses a section that is present but not a list', () => {
    expect(validateEnvelope(file({ data: { ...sections, workouts: {} } })).valid).toBe(false)
    expect(validateEnvelope(file({ data: { ...sections, tombstones: 'x' } })).valid).toBe(false)
  })
})

describe('a backup that can be read', () => {
  it('reads one with no tombstones, as every version 1 file is', () => {
    expect(validateEnvelope(file()).valid).toBe(true)
  })

  it('warns, but reads, a backup with no settings', () => {
    const { settings: _gone, ...noSettings } = sections
    const preview = validateEnvelope(file({ data: noSettings }))
    expect(preview.valid).toBe(true)
    expect(preview.problems[0]?.severity).toBe('warning')
  })

  it('reports the dates its sessions span', () => {
    const workouts = [{ date: '2026-03-01' }, { date: '2026-08-20' }, { date: '2026-05-05' }]
    expect(validateEnvelope(file({ data: { ...sections, workouts } })).dateRange).toEqual({
      from: '2026-03-01',
      to: '2026-08-20',
    })
  })
})
