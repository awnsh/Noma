import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import type { MacroStep } from '@shared/types'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../db'
import { createMacro, deleteMacro, duplicateMacro, getAllMacros, getMacroById, updateMacro } from './macrosRepository'

const COPY_PASTE: MacroStep[] = [
  { type: 'shortcut', keys: ['Control', 'C'] },
  { type: 'shortcut', keys: ['Control', 'V'] }
]

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('createMacro', () => {
  it('persists a macro and returns it with a generated id', () => {
    const macro = createMacro({
      name: 'Control+C → Control+V',
      applicationId: 'code',
      trigger: 'flow-control',
      actions: COPY_PASTE,
      delayMs: 0,
      enabled: true
    })

    expect(macro.id).toBeTruthy()

    const row = getDatabase().prepare('SELECT * FROM macros WHERE id = ?').get(macro.id) as {
      name: string
      application_id: string
      actions: string
      enabled: number
    }
    expect(row.name).toBe('Control+C → Control+V')
    expect(row.application_id).toBe('code')
    expect(JSON.parse(row.actions)).toEqual(COPY_PASTE)
    expect(row.enabled).toBe(1)
  })
})

describe('getAllMacros', () => {
  it('returns an empty list when none exist', () => {
    expect(getAllMacros()).toEqual([])
  })

  it('returns every created macro', () => {
    createMacro({
      name: 'First',
      trigger: 'flow-control',
      actions: [{ type: 'shortcut', keys: ['Control', 'C'] }],
      delayMs: 0,
      enabled: true
    })
    createMacro({
      name: 'Second',
      trigger: 'flow-control',
      actions: [{ type: 'shortcut', keys: ['Control', 'V'] }],
      delayMs: 0,
      enabled: true
    })

    const macros = getAllMacros()
    expect(macros).toHaveLength(2)
    expect(macros.map((m) => m.name).sort()).toEqual(['First', 'Second'])
  })
})

describe('updateMacro', () => {
  it('overwrites name/actions/enabled and persists the change', () => {
    const macro = createMacro({
      name: 'Original',
      trigger: 'manual',
      actions: [{ type: 'shortcut', keys: ['Control', 'C'] }],
      delayMs: 0,
      enabled: true
    })

    const updated = updateMacro(macro.id, { name: 'Renamed', actions: COPY_PASTE, enabled: false })

    expect(updated?.name).toBe('Renamed')
    expect(updated?.actions).toEqual(COPY_PASTE)
    expect(updated?.enabled).toBe(false)
    expect(getMacroById(macro.id)).toEqual(updated)
  })

  it('returns null for a macro id that does not exist', () => {
    expect(updateMacro('does-not-exist', { name: 'X' })).toBeNull()
  })
})

describe('deleteMacro', () => {
  it('removes the macro and reports true', () => {
    const macro = createMacro({
      name: 'Temp',
      trigger: 'manual',
      actions: [],
      delayMs: 0,
      enabled: true
    })
    expect(deleteMacro(macro.id)).toBe(true)
    expect(getMacroById(macro.id)).toBeNull()
  })

  it('returns false for a macro id that does not exist', () => {
    expect(deleteMacro('does-not-exist')).toBe(false)
  })
})

describe('duplicateMacro', () => {
  it('creates a new macro with the same steps and a distinct id', () => {
    const original = createMacro({
      name: 'Copy Paste',
      trigger: 'manual',
      actions: COPY_PASTE,
      delayMs: 0,
      enabled: true
    })

    const copy = duplicateMacro(original.id)

    expect(copy).not.toBeNull()
    expect(copy?.id).not.toBe(original.id)
    expect(copy?.name).toBe('Copy Paste copy')
    expect(copy?.actions).toEqual(COPY_PASTE)
    expect(getAllMacros()).toHaveLength(2)
  })

  it('returns null for a macro id that does not exist', () => {
    expect(duplicateMacro('does-not-exist')).toBeNull()
  })
})
