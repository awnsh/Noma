import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../db'
import {
  getConfidenceBiasForKind,
  getPendingSuggestions,
  getSuggestionById,
  insertSuggestionIfNew,
  resolveSuggestion
} from './suggestionsRepository'
import type { Suggestion } from '@shared/types'

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'suggestion:shortcut:code::Control+S',
    title: 'Assign Control+S to a Flow control?',
    explanation: 'You used it a lot.',
    confidence: 0.6,
    status: 'pending',
    createdAt: Date.now(),
    applicationId: 'code',
    action: { kind: 'assignShortcutToControl', comboKeys: ['Control', 'S'] },
    ...overrides
  }
}

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('insertSuggestionIfNew / getPendingSuggestions', () => {
  it('inserts a new suggestion and returns it as pending', () => {
    insertSuggestionIfNew(makeSuggestion())
    const pending = getPendingSuggestions()
    expect(pending).toHaveLength(1)
    expect(pending[0].id).toBe('suggestion:shortcut:code::Control+S')
  })

  it('round-trips applicationId and action through insert -> read', () => {
    insertSuggestionIfNew(makeSuggestion())
    const [pending] = getPendingSuggestions()
    expect(pending.applicationId).toBe('code')
    expect(pending.action).toEqual({ kind: 'assignShortcutToControl', comboKeys: ['Control', 'S'] })
  })

  it('degrades gracefully for a suggestion with no action (e.g. legacy row)', () => {
    insertSuggestionIfNew(makeSuggestion({ applicationId: undefined, action: undefined }))
    const [pending] = getPendingSuggestions()
    expect(pending.action).toBeUndefined()
  })

  it('does not duplicate an insert for the same id', () => {
    insertSuggestionIfNew(makeSuggestion())
    insertSuggestionIfNew(makeSuggestion({ title: 'A different title' }))
    const pending = getPendingSuggestions()
    expect(pending).toHaveLength(1)
    // The original insert wins — ON CONFLICT DO NOTHING.
    expect(pending[0].title).toBe('Assign Control+S to a Flow control?')
  })

  it('does not resurrect a suggestion that was already resolved', () => {
    insertSuggestionIfNew(makeSuggestion())
    resolveSuggestion('suggestion:shortcut:code::Control+S', 'rejected')
    insertSuggestionIfNew(makeSuggestion())
    expect(getPendingSuggestions()).toHaveLength(0)
    expect(getSuggestionById('suggestion:shortcut:code::Control+S')?.status).toBe('rejected')
  })
})

describe('resolveSuggestion', () => {
  it('updates status and sets resolvedAt', () => {
    insertSuggestionIfNew(makeSuggestion())
    const resolved = resolveSuggestion('suggestion:shortcut:code::Control+S', 'accepted')
    expect(resolved?.status).toBe('accepted')
    expect(resolved?.resolvedAt).toBeTypeOf('number')
    expect(getPendingSuggestions()).toHaveLength(0)
  })
})

describe('getConfidenceBiasForKind', () => {
  it('returns 0 when there is no history for that kind', () => {
    expect(getConfidenceBiasForKind('repeatedShortcut')).toBe(0)
  })

  it('returns a positive bias when a kind has more accepts than rejects', () => {
    insertSuggestionIfNew(makeSuggestion({ id: 'suggestion:shortcut:code::Control+S' }))
    resolveSuggestion('suggestion:shortcut:code::Control+S', 'accepted')
    insertSuggestionIfNew(makeSuggestion({ id: 'suggestion:shortcut:code::Control+D' }))
    resolveSuggestion('suggestion:shortcut:code::Control+D', 'accepted')

    expect(getConfidenceBiasForKind('repeatedShortcut')).toBeGreaterThan(0)
  })

  it('returns a negative bias when a kind has more rejects than accepts', () => {
    insertSuggestionIfNew(makeSuggestion({ id: 'suggestion:shortcut:code::Control+S' }))
    resolveSuggestion('suggestion:shortcut:code::Control+S', 'rejected')

    expect(getConfidenceBiasForKind('repeatedShortcut')).toBeLessThan(0)
  })

  it('keeps history for different pattern kinds separate', () => {
    insertSuggestionIfNew(makeSuggestion({ id: 'suggestion:shortcut:code::Control+S' }))
    resolveSuggestion('suggestion:shortcut:code::Control+S', 'rejected')

    expect(getConfidenceBiasForKind('repeatedSequence')).toBe(0)
  })
})
