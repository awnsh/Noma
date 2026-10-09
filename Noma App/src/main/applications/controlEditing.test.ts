import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { seedDefaultProfiles } from '../database/seed'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { DEMO_MACRO_TRIGGER, LEARNED_MACRO_TRIGGER } from '@shared/constants'
import { createMacro, getMacroById } from '../database/repositories/macrosRepository'
import { updateControl, clearControl } from './controlEditing'

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

    // Persisted, not returned; reading fresh confirms it stuck.
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

describe('clearControl', () => {
  it('empties only the chosen zone and leaves the others alone', () => {
    const before = getProfileForApplicationId('code')!.controls
    const profile = clearControl('code', 1)!

    const cleared = profile.controls.find((c) => c.slot === 1)
    expect(cleared?.label).toBe('')
    expect(cleared?.action).toEqual({ type: 'none' })
    for (const control of before.filter((c) => c.slot !== 1)) {
      expect(profile.controls.find((c) => c.slot === control.slot)).toEqual(control)
    }
  })

  it('returns null for an application with no profile', () => {
    expect(clearControl('never-seeded-app', 1)).toBeNull()
  })
})

function macroOn(slot: number, trigger: string): string {
  const id = createMacro({
    name: 'Workflow',
    applicationId: 'code',
    trigger,
    actions: [{ type: 'shortcut', keys: ['Control', 'C'] }],
    delayMs: 0,
    enabled: true
  }).id
  updateControl('code', slot, 'WORKFLOW', { type: 'macro', macroId: id })
  return id
}

describe('updateControl / clearControl; the workflow a control held', () => {
  it('deletes a learned or demo workflow once its only control is overwritten or cleared', () => {
    const learned = macroOn(1, LEARNED_MACRO_TRIGGER)
    updateControl('code', 1, 'Ctrl+S', { type: 'shortcut', keys: ['Control', 'S'] })
    expect(getMacroById(learned)).toBeNull()

    const demo = macroOn(2, DEMO_MACRO_TRIGGER)
    clearControl('code', 2)
    expect(getMacroById(demo)).toBeNull()
  })

  it('never deletes a user-authored macro', () => {
    const manual = macroOn(1, 'manual')
    clearControl('code', 1)
    expect(getMacroById(manual)).not.toBeNull()
  })

  it('keeps a learned workflow still on another control, or called by another macro', () => {
    const shared = macroOn(1, LEARNED_MACRO_TRIGGER)
    updateControl('code', 2, 'ALSO', { type: 'macro', macroId: shared })
    clearControl('code', 1)
    expect(getMacroById(shared)).not.toBeNull()

    const called = macroOn(3, LEARNED_MACRO_TRIGGER)
    createMacro({ name: 'Caller', trigger: 'manual', actions: [{ type: 'macro', macroId: called }], delayMs: 0, enabled: true })
    clearControl('code', 3)
    expect(getMacroById(called)).not.toBeNull()
  })

  it('keeps the workflow when the same macro is re-assigned (e.g. a rename)', () => {
    const learned = macroOn(1, LEARNED_MACRO_TRIGGER)
    updateControl('code', 1, 'RENAMED', { type: 'macro', macroId: learned })
    expect(getMacroById(learned)).not.toBeNull()
  })
})
