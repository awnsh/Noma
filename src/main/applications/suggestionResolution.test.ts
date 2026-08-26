import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { insertSuggestionIfNew, getSuggestionById } from '../database/repositories/suggestionsRepository'
import { assignSuggestionToControl } from './suggestionResolution'
import type { Suggestion } from '@shared/types'

function seedProfile(): void {
  const db = getDatabase()
  db.prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)').run(
    'code',
    'Visual Studio Code',
    'Code.exe'
  )
  db.prepare('INSERT INTO profiles (id, application_id, name) VALUES (?, ?, ?)').run(
    'code-default',
    'code',
    'Developer'
  )
  const insertControl = db.prepare(
    `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const slots = [
    ['ctrl-1', 1, 'RUN'],
    ['ctrl-2', 2, 'DEBUG'],
    ['ctrl-3', 3, 'TERMINAL'],
    ['ctrl-4', 4, 'SEARCH']
  ] as const
  for (const [id, slot, label] of slots) {
    insertControl.run(
      id,
      'code-default',
      slot,
      label,
      'shortcut',
      JSON.stringify({ type: 'shortcut', keys: ['Control', 'F5'] })
    )
  }
}

function shortcutSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'suggestion:shortcut:code::Control+S',
    title: 'Assign Control+S to a Flow control?',
    explanation: '...',
    confidence: 0.6,
    status: 'pending',
    createdAt: Date.now(),
    applicationId: 'code',
    action: { kind: 'assignShortcutToControl', comboKeys: ['Control', 'S'] },
    ...overrides
  }
}

function sequenceSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'suggestion:sequence:code::Control+C->Control+V',
    title: 'Create a macro for this sequence?',
    explanation: '...',
    confidence: 0.6,
    status: 'pending',
    createdAt: Date.now(),
    applicationId: 'code',
    action: { kind: 'createMacroAndAssignToControl', sequence: ['Control+C', 'Control+V'] },
    ...overrides
  }
}

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
  seedProfile()
})

describe('assignSuggestionToControl — repeatedShortcut', () => {
  it('overwrites the chosen slot, marks the suggestion accepted, and returns the updated profile', () => {
    insertSuggestionIfNew(shortcutSuggestion())

    const result = assignSuggestionToControl('suggestion:shortcut:code::Control+S', 2)

    expect(result).not.toBeNull()
    expect(result?.suggestion.status).toBe('accepted')

    const updatedControl = result?.profile.controls.find((c) => c.slot === 2)
    expect(updatedControl?.label).toBe('Control+S')
    expect(updatedControl?.action).toEqual({ type: 'shortcut', keys: ['Control', 'S'] })

    // Other slots are untouched.
    expect(result?.profile.controls.find((c) => c.slot === 1)?.label).toBe('RUN')

    expect(getSuggestionById('suggestion:shortcut:code::Control+S')?.status).toBe('accepted')
  })
})

describe('assignSuggestionToControl — repeatedSequence', () => {
  it('creates a macro and assigns it to the chosen slot', () => {
    insertSuggestionIfNew(sequenceSuggestion())

    const result = assignSuggestionToControl('suggestion:sequence:code::Control+C->Control+V', 3)

    expect(result).not.toBeNull()
    const updatedControl = result?.profile.controls.find((c) => c.slot === 3)
    expect(updatedControl?.action.type).toBe('macro')
    if (updatedControl?.action.type === 'macro') {
      const macroRow = getDatabase()
        .prepare('SELECT * FROM macros WHERE id = ?')
        .get(updatedControl.action.macroId) as { actions: string } | undefined
      expect(macroRow).toBeDefined()
      expect(JSON.parse(macroRow!.actions)).toEqual(['Control+C', 'Control+V'])
    }
  })
})

describe('assignSuggestionToControl — failure cases (fail closed, never guess)', () => {
  it('returns null for a suggestion that does not exist', () => {
    expect(assignSuggestionToControl('does-not-exist', 1)).toBeNull()
  })

  it('returns null for a suggestion that is not pending', () => {
    insertSuggestionIfNew(shortcutSuggestion({ status: 'rejected' }))
    expect(assignSuggestionToControl('suggestion:shortcut:code::Control+S', 1)).toBeNull()
  })

  it('returns null when the application has no profile', () => {
    insertSuggestionIfNew(
      shortcutSuggestion({
        id: 'suggestion:shortcut:unknownapp::Control+S',
        applicationId: 'unknownapp'
      })
    )
    expect(assignSuggestionToControl('suggestion:shortcut:unknownapp::Control+S', 1)).toBeNull()
  })

  it('returns null for a slot that does not exist on the profile', () => {
    insertSuggestionIfNew(shortcutSuggestion())
    expect(assignSuggestionToControl('suggestion:shortcut:code::Control+S', 99)).toBeNull()
  })

  it('does not mutate anything when it fails', () => {
    insertSuggestionIfNew(shortcutSuggestion())
    assignSuggestionToControl('suggestion:shortcut:code::Control+S', 99)
    expect(getSuggestionById('suggestion:shortcut:code::Control+S')?.status).toBe('pending')
  })
})
