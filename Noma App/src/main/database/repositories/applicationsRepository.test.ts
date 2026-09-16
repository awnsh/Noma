import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../db'
import { getAllApplications, getApplicationById, upsertApplication } from './applicationsRepository'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('upsertApplication', () => {
  it('inserts a new application', () => {
    upsertApplication({ id: 'notepad', name: 'Notepad', processName: 'notepad.exe' })
    expect(getApplicationById('notepad')).toEqual({
      id: 'notepad',
      name: 'Notepad',
      processName: 'notepad.exe',
      icon: undefined,
      executablePath: undefined
    })
  })

  it('does not overwrite an existing row on conflict', () => {
    upsertApplication({ id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' })
    // A later live-detection re-insert carrying the raw process name must
    // not clobber the nicer display name already on file.
    upsertApplication({ id: 'chrome', name: 'chrome', processName: 'chrome.exe' })
    expect(getApplicationById('chrome')?.name).toBe('Google Chrome')
  })

  it('backfills a missing executable path on conflict, without touching the name', () => {
    // Mirrors seed.ts's SEED_APPLICATIONS: a pre-seeded row with no real
    // path, then the real process is detected running for the first time.
    upsertApplication({ id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' })
    upsertApplication({
      id: 'code',
      name: 'code',
      processName: 'Code.exe',
      executablePath: 'C:\\Users\\test\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'
    })
    const application = getApplicationById('code')
    expect(application?.name).toBe('Visual Studio Code')
    expect(application?.executablePath).toBe(
      'C:\\Users\\test\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'
    )
  })

  it('never clobbers an already-known executable path with a later null', () => {
    upsertApplication({
      id: 'chrome',
      name: 'Google Chrome',
      processName: 'chrome.exe',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    })
    upsertApplication({ id: 'chrome', name: 'chrome', processName: 'chrome.exe' })
    expect(getApplicationById('chrome')?.executablePath).toBe(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    )
  })
})

describe('getApplicationById', () => {
  it('returns null for an application that does not exist', () => {
    expect(getApplicationById('does-not-exist')).toBeNull()
  })
})

describe('getAllApplications', () => {
  it('returns every known application, alphabetically', () => {
    upsertApplication({ id: 'zeta', name: 'Zeta App', processName: 'zeta.exe' })
    upsertApplication({ id: 'alpha', name: 'Alpha App', processName: 'alpha.exe' })
    expect(getAllApplications().map((a) => a.id)).toEqual(['alpha', 'zeta'])
  })
})
