import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../db'
import {
  getDailyActivityCounts,
  getShortcutUsageStats,
  insertWorkflowEvent
} from './workflowEventsRepository'
import { upsertApplication } from './applicationsRepository'
import { localDateKey, startOfDayMs } from '../../workflow/timeWindows'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('getShortcutUsageStats', () => {
  it('aggregates by combo + application, most-used first, with a live app name', () => {
    upsertApplication({ id: 'code', name: 'Visual Studio Code', processName: 'code.exe' })

    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: 1000
    })
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: 2000
    })
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'Shift', 'P'],
      timestamp: 1500
    })

    const stats = getShortcutUsageStats()

    expect(stats).toHaveLength(2)
    expect(stats[0]).toMatchObject({
      comboKeys: ['Control', 'S'],
      applicationId: 'code',
      applicationName: 'Visual Studio Code',
      count: 2,
      firstUsed: 1000,
      lastUsed: 2000
    })
    expect(stats[1]).toMatchObject({ comboKeys: ['Control', 'Shift', 'P'], count: 1 })
  })

  it('tracks the same combo separately per application', () => {
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: 1000
    })
    insertWorkflowEvent({
      applicationId: 'chrome',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: 1000
    })

    expect(getShortcutUsageStats()).toHaveLength(2)
  })

  it('ignores controlActivation events — only real captured shortcuts count', () => {
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'controlActivation',
      controlId: 'control-1',
      timestamp: 1000
    })

    expect(getShortcutUsageStats()).toHaveLength(0)
  })

  it('resolves a null applicationId to a null applicationName, not a crash', () => {
    insertWorkflowEvent({
      applicationId: null,
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: 1000
    })

    const stats = getShortcutUsageStats()
    expect(stats).toHaveLength(1)
    expect(stats[0].applicationId).toBeNull()
    expect(stats[0].applicationName).toBeNull()
  })
})

describe('getDailyActivityCounts', () => {
  it('zero-fills every day in range and buckets real events by local day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 3, 12, 0, 0)) // Sep 3, 2026, local noon

    const todayStart = startOfDayMs(new Date())
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: todayStart + 1000 // today
    })
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: todayStart - 24 * 60 * 60 * 1000 + 1000 // yesterday
    })

    const counts = getDailyActivityCounts(3)

    expect(counts).toHaveLength(3)
    expect(counts[2].date).toBe(localDateKey(new Date(2026, 8, 3)))
    expect(counts[2].count).toBe(1)
    expect(counts[1].date).toBe(localDateKey(new Date(2026, 8, 2)))
    expect(counts[1].count).toBe(1)
    expect(counts[0].count).toBe(0) // Sep 1 — zero-filled, not missing

    vi.useRealTimers()
  })

  it('excludes events older than the requested window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 3, 12, 0, 0))

    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: startOfDayMs(new Date()) - 10 * 24 * 60 * 60 * 1000
    })

    const counts = getDailyActivityCounts(3)
    expect(counts.reduce((sum, day) => sum + day.count, 0)).toBe(0)

    vi.useRealTimers()
  })
})
