import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, getDatabase, runMigrations } from '../database/db'
import { seedDefaultProfiles } from '../database/seed'
import { clearLearningData, deleteAllData } from './dataManagement'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
  seedDefaultProfiles(getDatabase())
})

function count(table: string): number {
  return (getDatabase().prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c
}

describe('clearLearningData', () => {
  it('deletes all workflow_events and suggestions', () => {
    const db = getDatabase()
    db.prepare(
      "INSERT INTO workflow_events (application_id, event_type, combo_keys, timestamp) VALUES ('code', 'shortcut', '[\"Control\",\"S\"]', 1)"
    ).run()
    db.prepare(
      "INSERT INTO suggestions (id, title, explanation, confidence) VALUES ('s1', 'T', 'E', 0.5)"
    ).run()

    clearLearningData()

    expect(count('workflow_events')).toBe(0)
    expect(count('suggestions')).toBe(0)
  })

  it('never touches applications, profiles, controls, or macros', () => {
    const db = getDatabase()
    db.prepare(
      "INSERT INTO macros (id, name, trigger, actions) VALUES ('m1', 'M', 'manual', '[]')"
    ).run()

    const appsBefore = count('applications')
    const controlsBefore = count('controls')

    clearLearningData()

    expect(count('applications')).toBe(appsBefore)
    expect(count('controls')).toBe(controlsBefore)
    expect(count('macros')).toBe(1)
  })
})

describe('deleteAllData', () => {
  it('wipes every table and re-seeds the default profiles', () => {
    const db = getDatabase()
    db.prepare(
      "INSERT INTO workflow_events (application_id, event_type, combo_keys, timestamp) VALUES ('code', 'shortcut', '[\"Control\",\"S\"]', 1)"
    ).run()
    db.prepare(
      "INSERT INTO suggestions (id, title, explanation, confidence) VALUES ('s1', 'T', 'E', 0.5)"
    ).run()
    db.prepare(
      "INSERT INTO macros (id, name, trigger, actions) VALUES ('m1', 'M', 'manual', '[]')"
    ).run()
    db.prepare("INSERT INTO settings (key, value) VALUES ('workflowMonitoringEnabled', '1')").run()

    const seededAppCount = count('applications')

    deleteAllData()

    expect(count('workflow_events')).toBe(0)
    expect(count('suggestions')).toBe(0)
    expect(count('macros')).toBe(0)
    expect(count('settings')).toBe(0)
    // Re-seeded back to the same starter set, not left empty.
    expect(count('applications')).toBe(seededAppCount)
    expect(count('controls')).toBe(seededAppCount * 4)
  })

  it('cascades profile/control deletion when applications are wiped', () => {
    deleteAllData()
    const orphanedControls = getDatabase()
      .prepare(
        'SELECT COUNT(*) as c FROM controls WHERE profile_id NOT IN (SELECT id FROM profiles)'
      )
      .get() as { c: number }
    expect(orphanedControls.c).toBe(0)
  })
})
