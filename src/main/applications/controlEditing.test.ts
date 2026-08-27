import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { seedDefaultProfiles } from '../database/seed'
import { updateControl, resetControlToDefault } from './controlEditing'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  seedDefaultProfiles(db)
  __setDatabaseForTesting(db)
})

describe('updateControl', () => {
  it('overwrites the label and action of an existing control', () => {
    const profile = updateControl('code', 1, 'Ctrl+S', { type: 'shortcut', keys: ['Control', 'S'] })

    expect(profile).not.toBeNull()
    const control = profile?.controls.find((c) => c.slot === 1)
    expect(control?.label).toBe('Ctrl+S')
    expect(control?.action).toEqual({ type: 'shortcut', keys: ['Control', 'S'] })

    // Persisted, not just returned — reading fresh confirms it stuck.
    const reread = getDatabase()
      .prepare(
        `SELECT label FROM controls WHERE profile_id = 'code-default' AND slot = 1`
      )
      .get() as { label: string }
    expect(reread.label).toBe('Ctrl+S')
  })

  it('leaves the other 3 controls untouched', () => {
    const profile = updateControl('code', 1, 'Ctrl+S', { type: 'shortcut', keys: ['Control', 'S'] })
    expect(profile?.controls.find((c) => c.slot === 2)?.label).toBe('DEBUG')
  })

  it('returns null for an application with no profile', () => {
    expect(
      updateControl('never-seeded-app', 1, 'X', { type: 'shortcut', keys: ['Control', 'X'] })
    ).toBeNull()
  })

  it('returns null for a slot that does not exist on the profile', () => {
    expect(
      updateControl('code', 99, 'X', { type: 'shortcut', keys: ['Control', 'X'] })
    ).toBeNull()
  })
})

describe('resetControlToDefault', () => {
  it('restores a seeded control back to its original configuration', () => {
    updateControl('code', 1, 'Changed', { type: 'shortcut', keys: ['Control', 'Z'] })

    const profile = resetControlToDefault('code', 1)
    const control = profile?.controls.find((c) => c.slot === 1)

    expect(control?.label).toBe('RUN')
    expect(control?.action).toEqual({ type: 'shortcut', keys: ['Control', 'F5'] })
  })

  it('returns null for an application that was never seeded', () => {
    expect(resetControlToDefault('never-seeded-app', 1)).toBeNull()
  })
})
