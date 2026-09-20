import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../database/db'
import { insertWorkflowEvent } from '../database/repositories/workflowEventsRepository'
import { getAllSuggestions, getPendingSuggestions, resolveSuggestion } from '../database/repositories/suggestionsRepository'
import { loadQualityModel } from '../database/repositories/qualityModelRepository'
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

  it('trains the quality model when a suggestion is resolved, once per suggestion', async () => {
    for (let i = 0; i < 5; i++) {
      insertWorkflowEvent({
        applicationId: 'code',
        eventType: 'shortcut',
        comboKeys: ['Control', 'S'],
        timestamp: Date.now() + i * 60_000
      })
    }
    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()

    const [suggestion] = getPendingSuggestions()
    resolveSuggestion(suggestion.id, 'rejected')
    resolveSuggestion(suggestion.id, 'rejected')

    expect(loadQualityModel().examples).toBe(1)
    expect(getAllSuggestions()).toHaveLength(1)
  })

  it('shows one suggestion for a repeated loop, not one per rotation', async () => {
    // A → B → C → A → B → C … across several separate sittings.
    const apps = ['a', 'b', 'c']
    let t = Date.now()
    for (let sitting = 0; sitting < 3; sitting++) {
      for (let lap = 0; lap < 3; lap++) {
        for (const applicationId of apps) {
          insertWorkflowEvent({ applicationId, eventType: 'appSwitch', timestamp: (t += 2_000) })
        }
      }
      t += 10 * 60_000
    }

    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()
    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()

    expect(getPendingSuggestions().length).toBeLessThanOrEqual(1)
  })

  it('names an in-app action the way the app does: repeated Ctrl+B in DaVinci is "Blade"', async () => {
    for (let i = 0; i < 6; i++) {
      insertWorkflowEvent({
        applicationId: 'resolve',
        eventType: 'shortcut',
        comboKeys: ['Control', 'B'],
        timestamp: Date.now() + i * 60_000
      })
    }
    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()

    const [suggestion] = getPendingSuggestions()
    expect(suggestion.title).toContain('Blade (Control+B)')
  })

  it('ignores a detour through a music player: code → Spotify → terminal is code → terminal', async () => {
    let t = Date.now()
    for (let sitting = 0; sitting < 3; sitting++) {
      for (let lap = 0; lap < 2; lap++) {
        for (const applicationId of ['code', 'spotify', 'windowsterminal', 'chrome']) {
          insertWorkflowEvent({ applicationId, eventType: 'appSwitch', timestamp: (t += 2_000) })
        }
      }
      t += 10 * 60_000
    }
    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()

    const suggestions = getPendingSuggestions()
    expect(suggestions.length).toBeGreaterThan(0)
    for (const suggestion of suggestions) {
      expect(suggestion.explanation.toLowerCase()).not.toContain('spotify')
      expect(JSON.stringify(suggestion.action ?? {}).toLowerCase()).not.toContain('spotify')
    }
  })

  it('recognizes an in-app click workflow: Cut then Delete, repeated across sittings', async () => {
    let t = Date.now()
    for (let sitting = 0; sitting < 3; sitting++) {
      for (let round = 0; round < 2; round++) {
        insertWorkflowEvent({ applicationId: 'resolve', eventType: 'click', clickTarget: 'label:Cut', timestamp: (t += 3_000) })
        insertWorkflowEvent({ applicationId: 'resolve', eventType: 'click', clickTarget: 'label:Delete', timestamp: (t += 1_500) })
        t += 20_000
      }
      t += 10 * 60_000
    }
    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()

    const suggestions = getPendingSuggestions()
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].explanation).toContain('Click “Cut”')
    expect(suggestions[0].explanation).toContain('Click “Delete”')
    // Can't be replayed, so it's informational: no action, no control slot.
    expect(suggestions[0].action).toBeUndefined()
    expect(suggestions[0].applicationId).toBeNull()
  })

  it('does not call a burst of button-mashing a workflow', async () => {
    const t = Date.now()
    for (let i = 0; i < 12; i++) {
      insertWorkflowEvent({ applicationId: 'resolve', eventType: 'click', clickTarget: i % 2 ? 'label:Cut' : 'label:Delete', timestamp: t + i * 150 })
    }
    await new SuggestionEngine(new LocalRuleBasedProvider()).refresh()
    expect(getPendingSuggestions()).toHaveLength(0)
  })
})
