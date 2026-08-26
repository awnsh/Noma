import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../db'
import { createMacro } from './macrosRepository'

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
      actions: ['Control+C', 'Control+V'],
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
    expect(JSON.parse(row.actions)).toEqual(['Control+C', 'Control+V'])
    expect(row.enabled).toBe(1)
  })
})
