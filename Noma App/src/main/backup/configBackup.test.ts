import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../database/db'
import { seedDefaultProfiles } from '../database/seed'
import {
  CONFIG_FILE_VERSION,
  applyConfigImport,
  buildConfigExport,
  parseConfigFile,
  previewConfigImport,
  type ConfigFile
} from './configBackup'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  seedDefaultProfiles(db)
})

function count(table: string): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c
}

function addMacro(id: string, name = 'Save all'): void {
  db.prepare(
    `INSERT INTO macros (id, name, application_id, trigger, actions, delay_ms, enabled)
     VALUES (?, ?, 'code', 'manual', ?, 0, 1)`
  ).run(id, name, JSON.stringify([{ type: 'shortcut', keys: ['Control', 'S'] }, { type: 'delay', ms: 100 }]))
}

function exportText(): string {
  return JSON.stringify(buildConfigExport(db, '0.1.11', new Date('2026-10-07T12:00:00Z')))
}

function parsed(text: string): ConfigFile {
  const result = parseConfigFile(text)
  if (!result.ok) throw new Error(result.reason)
  return result.config
}

function mutate(edit: (raw: Record<string, any>) => void): string {
  const raw = JSON.parse(exportText())
  edit(raw)
  return JSON.stringify(raw)
}

describe('buildConfigExport', () => {
  it('includes configuration and leaves learning data out', () => {
    addMacro('m1')
    db.prepare("INSERT INTO workflow_events (application_id, event_type, timestamp) VALUES ('code', 'shortcut', 1)").run()
    db.prepare("INSERT INTO suggestions (id, title, explanation, confidence) VALUES ('s1', 'T', 'E', 0.5)").run()

    const config = buildConfigExport(db, '0.1.11')

    expect(config.format).toBe('noma-settings')
    expect(config.version).toBe(CONFIG_FILE_VERSION)
    expect(config.applications.length).toBe(count('applications'))
    expect(config.profiles.length).toBe(count('profiles'))
    expect(config.controls.length).toBe(count('controls'))
    expect(config.macros.map((macro) => macro.id)).toEqual(['m1'])
    expect(Object.keys(config)).not.toContain('workflowEvents')
    expect(Object.keys(config)).not.toContain('suggestions')
    expect(JSON.stringify(config)).not.toContain('s1')
  })

  it('round-trips through parseConfigFile', () => {
    addMacro('m1')
    const config = parsed(exportText())
    expect(config.controls[0].action.type).toBe('shortcut')
    expect(config.macros[0].actions).toEqual([
      { type: 'shortcut', keys: ['Control', 'S'] },
      { type: 'delay', ms: 100 }
    ])
  })
})

describe('parseConfigFile', () => {
  it.each([
    ['not JSON', '{nope', 'not valid JSON'],
    ['another format', JSON.stringify({ format: 'other', version: 1 }), 'not a Noma settings file'],
    ['a JSON array', '[]', 'not a Noma settings file']
  ])('rejects %s', (_name, text, reason) => {
    const result = parseConfigFile(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain(reason)
  })

  it('rejects a newer version with a plain reason', () => {
    const result = parseConfigFile(mutate((raw) => (raw.version = CONFIG_FILE_VERSION + 1)))
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('newer version of Noma') })
  })

  it('rejects unknown top-level sections, including learning data', () => {
    const result = parseConfigFile(mutate((raw) => (raw.workflowEvents = [])))
    expect(result.ok).toBe(false)
  })

  it('rejects a missing section', () => {
    expect(parseConfigFile(mutate((raw) => delete raw.macros)).ok).toBe(false)
  })

  it('rejects a control whose profile is not in the file', () => {
    expect(parseConfigFile(mutate((raw) => (raw.controls[0].profileId = 'ghost'))).ok).toBe(false)
  })

  it('rejects a profile whose app is not in the file', () => {
    expect(parseConfigFile(mutate((raw) => (raw.profiles[0].applicationId = 'ghost'))).ok).toBe(false)
  })

  it('rejects duplicate ids and duplicate slots', () => {
    expect(parseConfigFile(mutate((raw) => (raw.controls[1].id = raw.controls[0].id))).ok).toBe(false)
    expect(parseConfigFile(mutate((raw) => (raw.controls[1].slot = raw.controls[0].slot))).ok).toBe(false)
  })

  it('rejects out-of-range slots, long labels and unknown actions', () => {
    expect(parseConfigFile(mutate((raw) => (raw.controls[0].slot = 9))).ok).toBe(false)
    expect(parseConfigFile(mutate((raw) => (raw.controls[0].label = 'X'.repeat(40)))).ok).toBe(false)
    expect(parseConfigFile(mutate((raw) => (raw.controls[0].action = { type: 'runShell', cmd: 'rm' }))).ok).toBe(false)
    expect(
      parseConfigFile(mutate((raw) => (raw.controls[0].action = { type: 'systemCommand', command: 'shutdown' }))).ok
    ).toBe(false)
    expect(parseConfigFile(mutate((raw) => (raw.controls[0].action = { type: 'delay', ms: 5 }))).ok).toBe(false)
  })

  it('rejects malformed macro steps', () => {
    addMacro('m1')
    expect(parseConfigFile(mutate((raw) => (raw.macros[0].actions = [{ type: 'delay', ms: -1 }]))).ok).toBe(false)
    expect(parseConfigFile(mutate((raw) => (raw.macros[0].enabled = 'yes'))).ok).toBe(false)
  })
})

describe('previewConfigImport and applyConfigImport', () => {
  function fileWith(edit: (raw: Record<string, any>) => void): ConfigFile {
    return parsed(mutate(edit))
  }

  it('merge: replaces the profile of each app in the file and keeps the rest', () => {
    addMacro('m-local', 'Local only')
    const before = count('profiles')
    // A file with only the VS Code profile, its first zone relabelled, and a new macro.
    const config = fileWith((raw) => {
      raw.profiles = raw.profiles.filter((profile: any) => profile.applicationId === 'code')
      const profileIds = new Set(raw.profiles.map((profile: any) => profile.id))
      raw.controls = raw.controls.filter((control: any) => profileIds.has(control.profileId))
      raw.controls[0].label = 'IMPORTED'
      raw.macros = [{ id: 'm-new', name: 'New', applicationId: null, trigger: 'manual', actions: [], delayMs: 0, enabled: true }]
    })

    expect(previewConfigImport(db, config, 'merge')).toEqual({
      profiles: { added: 0, replaced: 1, removed: 0 },
      controls: { added: 4, removed: 4 },
      macros: { added: 1, replaced: 0, removed: 0 }
    })

    applyConfigImport(db, config, 'merge')

    expect(count('profiles')).toBe(before)
    expect(count('macros')).toBe(2)
    const labels = db
      .prepare("SELECT c.label FROM controls c JOIN profiles p ON p.id = c.profile_id WHERE p.application_id = 'code' ORDER BY slot")
      .all() as Array<{ label: string }>
    expect(labels[0].label).toBe('IMPORTED')
  })

  it('replace: removes profiles, controls and macros that are not in the file', () => {
    addMacro('m-local')
    const config = fileWith((raw) => {
      raw.profiles = raw.profiles.filter((profile: any) => profile.applicationId === 'chrome')
      const profileIds = new Set(raw.profiles.map((profile: any) => profile.id))
      raw.controls = raw.controls.filter((control: any) => profileIds.has(control.profileId))
      raw.macros = []
    })
    const profilesBefore = count('profiles')
    const controlsBefore = count('controls')

    expect(previewConfigImport(db, config, 'replace')).toEqual({
      profiles: { added: 0, replaced: 1, removed: profilesBefore - 1 },
      controls: { added: 4, removed: controlsBefore },
      macros: { added: 0, replaced: 0, removed: 1 }
    })

    applyConfigImport(db, config, 'replace')

    expect(count('profiles')).toBe(1)
    expect(count('controls')).toBe(4)
    expect(count('macros')).toBe(0)
    // Applications are never removed: they're just apps Noma has seen.
    expect(count('applications')).toBeGreaterThan(1)
  })

  it('adds applications the database does not have yet, leaving existing ones alone', () => {
    db.prepare("UPDATE applications SET name = 'My Code' WHERE id = 'code'").run()
    const config = fileWith((raw) => {
      raw.applications.push({ id: 'figma', name: 'Figma', processName: 'Figma.exe', icon: null })
      raw.profiles.push({ id: 'figma-default', applicationId: 'figma', name: 'Design', icon: null, isActive: true })
      raw.controls.push({ id: 'figma-1', profileId: 'figma-default', slot: 1, label: 'FRAME', action: { type: 'shortcut', keys: ['F'] } })
    })

    expect(previewConfigImport(db, config, 'merge').profiles.added).toBe(1)
    applyConfigImport(db, config, 'merge')

    expect(db.prepare("SELECT name FROM applications WHERE id = 'figma'").get()).toEqual({ name: 'Figma' })
    expect(db.prepare("SELECT name FROM applications WHERE id = 'code'").get()).toEqual({ name: 'My Code' })
  })

  it('rolls back everything if a write fails partway', () => {
    addMacro('m-local')
    const config = parsed(exportText())
    // Force the last insert to fail after earlier deletes and inserts ran.
    db.exec(`CREATE TRIGGER fail_macro BEFORE INSERT ON macros BEGIN SELECT RAISE(ABORT, 'boom'); END;`)
    const snapshot = JSON.stringify(buildConfigExport(db, 'x', new Date(0)))

    expect(() => applyConfigImport(db, config, 'replace')).toThrow('boom')
    expect(JSON.stringify(buildConfigExport(db, 'x', new Date(0)))).toBe(snapshot)
  })

  it('a database import of its own export changes nothing', () => {
    addMacro('m1')
    const snapshot = JSON.stringify(buildConfigExport(db, 'x', new Date(0)).controls)
    const config = parsed(exportText())
    applyConfigImport(db, config, 'replace')
    expect(JSON.stringify(buildConfigExport(db, 'x', new Date(0)).controls)).toBe(snapshot)
    expect(count('macros')).toBe(1)
  })
})
