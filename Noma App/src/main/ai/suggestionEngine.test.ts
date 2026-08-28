import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../database/db'
import { insertWorkflowEvent } from '../database/repositories/workflowEventsRepository'
import { getPendingSuggestions } from '../database/repositories/suggestionsRepository'
import { LocalRuleBasedProvider } from './localProvider'
import { SuggestionEngine } from './suggestionEngine'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('SuggestionEngine.refresh (end-to-end: events -> patterns -> suggestions)', () => {
  it('produces no suggestions when no pattern has crossed its threshold', async () => {
    insertWorkflowEvent({
      applicationId: 'code',
      eventType: 'shortcut',
      comboKeys: ['Control', 'S'],
      timestamp: Date.now()
    })

    const engine = new SuggestionEngine(new LocalRuleBasedProvider())
    await engine.refresh()

    expect(getPendingSuggestions()).toHaveLength(0)
  })

  it('persists a suggestion once a shortcut is used enough times today', async () => {
    for (let i = 0; i < 5; i++) {
      insertWorkflowEvent({
        applicationId: 'code',
        eventType: 'shortcut',
        comboKeys: ['Control', 'S'],
        // Spread far apart so they don't also register as a repeated
        // sequence — this test is only about the repeatedShortcut path.
        timestamp: Date.now() + i * 60_000
      })
    }

    const engine = new SuggestionEngine(new LocalRuleBasedProvider())
    await engine.refresh()

    const pending = getPendingSuggestions()
    expect(pending).toHaveLength(1)
    expect(pending[0].title).toContain('Control+S')
    expect(pending[0].status).toBe('pending')
  })

  it('is idempotent — calling refresh again does not duplicate the suggestion', async () => {
    for (let i = 0; i < 5; i++) {
      insertWorkflowEvent({
        applicationId: 'code',
        eventType: 'shortcut',
        comboKeys: ['Control', 'S'],
        timestamp: Date.now() + i * 60_000
      })
    }

    const engine = new SuggestionEngine(new LocalRuleBasedProvider())
    await engine.refresh()
    await engine.refresh()
    await engine.refresh()

    expect(getPendingSuggestions()).toHaveLength(1)
  })
})
