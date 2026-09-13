import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../db'
import {
  getInputSource,
  getWorkflowMonitoringEnabled,
  setInputSource,
  setWorkflowMonitoringEnabled
} from './settingsRepository'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('workflow monitoring setting', () => {
  it('is off by default', () => {
    expect(getWorkflowMonitoringEnabled()).toBe(false)
  })

  it('persists across get/set', () => {
    setWorkflowMonitoringEnabled(true)
    expect(getWorkflowMonitoringEnabled()).toBe(true)
    setWorkflowMonitoringEnabled(false)
    expect(getWorkflowMonitoringEnabled()).toBe(false)
  })
})

describe('input source setting', () => {
  it('defaults to keyboard — Holo is opt-in', () => {
    expect(getInputSource()).toBe('keyboard')
  })

  it('persists a switch to holo, and back', () => {
    setInputSource('holo')
    expect(getInputSource()).toBe('holo')
    setInputSource('keyboard')
    expect(getInputSource()).toBe('keyboard')
  })
})
