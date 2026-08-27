import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import {
  createProfileForApplication,
  deleteApplicationProfile,
  listApplicationProfileSummaries,
  renameApplicationProfile
} from './profileCreation'

const NOTEPAD = { id: 'notepad', name: 'Notepad', processName: 'notepad.exe' }

beforeEach(() => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('createProfileForApplication', () => {
  it('creates the application row, a profile, and 4 unconfigured controls', () => {
    const profile = createProfileForApplication(NOTEPAD, 'My Notepad Setup')

    expect(profile).not.toBeNull()
    expect(profile?.name).toBe('My Notepad Setup')
    expect(profile?.controls).toHaveLength(4)
    expect(profile?.controls.every((c) => c.action.type === 'shortcut')).toBe(true)
    expect(getApplicationById('notepad')).not.toBeNull()
  })

  it('gives every control a distinct slot label and an empty, safe-no-op action', () => {
    const profile = createProfileForApplication(NOTEPAD, 'My Notepad Setup')
    expect(profile?.controls.map((c) => c.slot).sort()).toEqual([1, 2, 3, 4])
    for (const control of profile!.controls) {
      expect(control.action).toEqual({ type: 'shortcut', keys: [] })
    }
  })

  it('returns null and creates nothing when the application already has a profile', () => {
    createProfileForApplication(NOTEPAD, 'First')
    const second = createProfileForApplication(NOTEPAD, 'Second')
    expect(second).toBeNull()

    const count = getDatabase().prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }
    expect(count.c).toBe(1)
  })

  it('does not clobber an existing application row (e.g. a seeded display name)', () => {
    getDatabase()
      .prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)')
      .run('notepad', 'Notepad (seeded)', 'notepad.exe')

    createProfileForApplication(NOTEPAD, 'My Setup')
    expect(getApplicationById('notepad')?.name).toBe('Notepad (seeded)')
  })
})

describe('renameApplicationProfile', () => {
  it('renames an existing profile', () => {
    createProfileForApplication(NOTEPAD, 'Original')
    const renamed = renameApplicationProfile('notepad', 'Renamed')
    expect(renamed?.name).toBe('Renamed')
  })

  it('returns null when the application has no profile', () => {
    expect(renameApplicationProfile('does-not-exist', 'X')).toBeNull()
  })
})

describe('deleteApplicationProfile', () => {
  it('deletes the profile and its controls, and reports true', () => {
    createProfileForApplication(NOTEPAD, 'Temp')
    expect(deleteApplicationProfile('notepad')).toBe(true)

    const profileCount = getDatabase().prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }
    const controlCount = getDatabase().prepare('SELECT COUNT(*) as c FROM controls').get() as { c: number }
    expect(profileCount.c).toBe(0)
    expect(controlCount.c).toBe(0)
  })

  it('returns false when the application has no profile', () => {
    expect(deleteApplicationProfile('does-not-exist')).toBe(false)
  })
})

describe('listApplicationProfileSummaries', () => {
  it('reports hasProfile per known application', () => {
    getDatabase()
      .prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)')
      .run('unconfigured', 'Unconfigured App', 'unconfigured.exe')
    createProfileForApplication(NOTEPAD, 'Notepad Profile')

    const summaries = listApplicationProfileSummaries()
    const notepadSummary = summaries.find((s) => s.application.id === 'notepad')
    const unconfiguredSummary = summaries.find((s) => s.application.id === 'unconfigured')

    expect(notepadSummary).toMatchObject({ hasProfile: true, profileName: 'Notepad Profile' })
    expect(unconfiguredSummary).toMatchObject({ hasProfile: false })
  })

  it('returns an empty list when no applications are known', () => {
    expect(listApplicationProfileSummaries()).toEqual([])
  })
})
