import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../db'
import { assignControlAction, getControlsReferencingMacro, toDisplayLabel } from './controlsRepository'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)

  const db2 = getDatabase()
  db2.prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)').run(
    'code',
    'Visual Studio Code',
    'Code.exe'
  )
  db2.prepare('INSERT INTO profiles (id, application_id, name) VALUES (?, ?, ?)').run(
    'code-default',
    'code',
    'Developer'
  )
  db2
    .prepare(
      `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run('ctrl-1', 'code-default', 1, 'RUN', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'F5'] }))
})

describe('toDisplayLabel', () => {
  it('leaves short labels untouched', () => {
    expect(toDisplayLabel('Control+S')).toBe('Control+S')
  })

  it('truncates long labels for a small physical display', () => {
    const label = toDisplayLabel('Control+Shift+Alt+P')
    expect(label.length).toBeLessThanOrEqual(12)
    expect(label.endsWith('…')).toBe(true)
  })
})

describe('assignControlAction', () => {
  it('overwrites the label and action of the matching profile/slot', () => {
    const applied = assignControlAction('code-default', 1, 'Control+S', {
      type: 'shortcut',
      keys: ['Control', 'S']
    })
    expect(applied).toBe(true)

    const row = getDatabase()
      .prepare('SELECT label, action_type, action_payload FROM controls WHERE profile_id = ? AND slot = ?')
      .get('code-default', 1) as { label: string; action_type: string; action_payload: string }

    expect(row.label).toBe('Control+S')
    expect(row.action_type).toBe('shortcut')
    expect(JSON.parse(row.action_payload)).toEqual({ type: 'shortcut', keys: ['Control', 'S'] })
  })

  it('returns false and changes nothing for a slot that does not exist', () => {
    const applied = assignControlAction('code-default', 99, 'Nope', {
      type: 'shortcut',
      keys: ['Control', 'S']
    })
    expect(applied).toBe(false)
  })
})

describe('getControlsReferencingMacro', () => {
  it('finds the control assigned to the given macro id', () => {
    assignControlAction('code-default', 1, 'My Macro', { type: 'macro', macroId: 'macro-1' })

    const refs = getControlsReferencingMacro('macro-1')
    expect(refs).toEqual([
      { applicationId: 'code', applicationName: 'Visual Studio Code', slot: 1, label: 'My Macro' }
    ])
  })

  it('returns an empty list when no control points at this macro', () => {
    expect(getControlsReferencingMacro('macro-1')).toEqual([])
  })

  it('does not match a different macro id assigned elsewhere', () => {
    assignControlAction('code-default', 1, 'Other', { type: 'macro', macroId: 'macro-2' })
    expect(getControlsReferencingMacro('macro-1')).toEqual([])
  })
})
