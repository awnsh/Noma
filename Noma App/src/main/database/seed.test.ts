import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from './db'
import { getSeedDefaultControl, seedDefaultProfiles } from './seed'
import { isBlockedShortcut, isKnownFlowAction, resolveShortcutParts } from '../actions/actionExecutor'
import { isKnownSystemCommand } from '../actions/systemCommands'
import type { ControlAction } from '@shared/types'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('seedDefaultProfiles', () => {
  it('seeds applications, profiles, and 4 controls each', () => {
    seedDefaultProfiles(getDatabase())
    const apps = getDatabase().prepare('SELECT COUNT(*) as c FROM applications').get() as {
      c: number
    }
    const controls = getDatabase().prepare('SELECT COUNT(*) as c FROM controls').get() as {
      c: number
    }
    expect(apps.c).toBeGreaterThan(0)
    expect(controls.c).toBe(apps.c * 4)
  })

  it('does not reseed into a non-empty database', () => {
    seedDefaultProfiles(getDatabase())
    getDatabase().prepare("INSERT INTO applications (id, name, process_name) VALUES ('x','X','x.exe')").run()
    seedDefaultProfiles(getDatabase())
    const apps = getDatabase().prepare('SELECT id FROM applications').all() as Array<{ id: string }>
    // Only the manually-inserted row plus the original seed — not doubled.
    expect(apps.filter((a) => a.id === 'code')).toHaveLength(1)
  })

  it('every seeded control action is real and actually executable', () => {
    seedDefaultProfiles(getDatabase())
    const rows = getDatabase().prepare('SELECT action_payload FROM controls').all() as Array<{
      action_payload: string
    }>

    for (const row of rows) {
      const action = JSON.parse(row.action_payload) as ControlAction
      if (action.type === 'shortcut') {
        expect(resolveShortcutParts(action.keys), `unresolvable keys: ${action.keys.join('+')}`).not.toBeNull()
        // A seeded control that resolves but is also blocked would be a
        // silently-dead button — exactly the Chrome CLOSE TAB mistake.
        expect(isBlockedShortcut(action.keys), `seeded a blocked combo: ${action.keys.join('+')}`).toBe(
          false
        )
      } else if (action.type === 'systemCommand') {
        expect(isKnownSystemCommand(action.command), `unknown command: ${action.command}`).toBe(true)
      } else if (action.type === 'flowAction') {
        expect(isKnownFlowAction(action.action), `unimplemented flowAction: ${action.action}`).toBe(true)
      }
    }
  })
})

describe('getSeedDefaultControl', () => {
  it('returns the original seed control for a seeded application/slot', () => {
    expect(getSeedDefaultControl('code', 1)).toEqual({
      label: 'RUN',
      action: { type: 'shortcut', keys: ['Control', 'F5'] }
    })
  })

  it('returns null for an application that was never seeded', () => {
    expect(getSeedDefaultControl('never-seeded-app', 1)).toBeNull()
  })

  it('returns null for a slot that does not exist', () => {
    expect(getSeedDefaultControl('code', 99)).toBeNull()
  })
})
