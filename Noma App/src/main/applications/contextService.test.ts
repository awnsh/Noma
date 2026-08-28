import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { ApplicationContextService } from './contextService'
import type { OSAdapter } from '../os/types'
import type { Application } from '@shared/types'

/** A minimal fake OSAdapter whose "real" application can be driven
 *  directly from a test, and which records whether it was ever asked for
 *  its current application (used to verify setDemoApplication(null)
 *  re-syncs from it). */
class FakeOSAdapter implements OSAdapter {
  current: Application | null = null
  private listeners = new Set<(app: Application | null) => void>()

  async getActiveApplication(): Promise<Application | null> {
    return this.current
  }

  onActiveApplicationChanged(callback: (app: Application | null) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /** Simulates a real foreground-window change reaching the adapter. */
  emitRealChange(app: Application | null): void {
    this.current = app
    for (const listener of this.listeners) listener(app)
  }
}

function seedProfile(applicationId: string, name: string): void {
  const db = getDatabase()
  db.prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)').run(
    applicationId,
    name,
    `${applicationId}.exe`
  )
  db.prepare('INSERT INTO profiles (id, application_id, name) VALUES (?, ?, ?)').run(
    `${applicationId}-default`,
    applicationId,
    'Default'
  )
}

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
  seedProfile('code', 'Visual Studio Code')
  seedProfile('chrome', 'Google Chrome')
})

describe('ApplicationContextService — demo override', () => {
  it('setDemoApplication overrides the context and resolves the real profile for it', async () => {
    const osAdapter = new FakeOSAdapter()
    const service = new ApplicationContextService(osAdapter)
    service.start()

    await service.setDemoApplication({ id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' })

    const context = service.getContext()
    expect(context.application?.id).toBe('chrome')
    expect(context.profile?.applicationId).toBe('chrome')
  })

  it('ignores real OS changes while a demo override is active', async () => {
    const osAdapter = new FakeOSAdapter()
    const service = new ApplicationContextService(osAdapter)
    service.start()

    await service.setDemoApplication({ id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' })
    osAdapter.emitRealChange({ id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' })

    expect(service.getContext().application?.id).toBe('code')
  })

  it('setDemoApplication(null) hands control back and re-syncs from the OS adapter immediately', async () => {
    const osAdapter = new FakeOSAdapter()
    osAdapter.current = { id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' }
    const service = new ApplicationContextService(osAdapter)
    service.start()

    await service.setDemoApplication({ id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' })
    await service.setDemoApplication(null)

    expect(service.getContext().application?.id).toBe('chrome')

    // Real OS changes are honored again after the override is cleared.
    osAdapter.emitRealChange({ id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' })
    expect(service.getContext().application?.id).toBe('code')
  })

  it('notifies listeners on both entering and leaving a demo override', async () => {
    const osAdapter = new FakeOSAdapter()
    const service = new ApplicationContextService(osAdapter)
    service.start()

    const seen: Array<string | null> = []
    service.onContextChanged((context) => seen.push(context.application?.id ?? null))

    await service.setDemoApplication({ id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' })
    await service.setDemoApplication(null)

    expect(seen).toEqual(['code', null])
  })
})
