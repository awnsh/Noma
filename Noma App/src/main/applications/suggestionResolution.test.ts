import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { insertSuggestionIfNew, getSuggestionById } from '../database/repositories/suggestionsRepository'
import { assignSuggestionToControl, buildWorkflowMacroSteps } from './suggestionResolution'
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

describe('assignSuggestionToControl; repeatedShortcut', () => {
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

describe('assignSuggestionToControl; repeatedSequence', () => {
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
      expect(JSON.parse(macroRow!.actions)).toEqual([
        { type: 'shortcut', keys: ['Control', 'C'] },
        { type: 'shortcut', keys: ['Control', 'V'] }
      ])
    }
  })
})

function workflowSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'suggestion:multistep:key:code:Meta+Shift+S->app:claude->key:claude:Control+V->app:code',
    title: 'Noma noticed a workflow',
    explanation: '...',
    confidence: 0.8,
    status: 'pending',
    createdAt: Date.now(),
    applicationId: 'code',
    action: {
      kind: 'createWorkflowMacroAndAssignToControl',
      steps: [
        { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
        { type: 'appSwitch', applicationId: 'claude' },
        { type: 'shortcut', applicationId: 'claude', comboKeys: ['Control', 'V'] },
        { type: 'appSwitch', applicationId: 'code' }
      ]
    },
    ...overrides
  }
}

describe('assignSuggestionToControl; multiStepWorkflow (WORKFLOW LEARNING)', () => {
  it('creates a real macro; focus, paste, and an appended submit; and assigns it to the chosen slot', () => {
    insertSuggestionIfNew(workflowSuggestion())

    const result = assignSuggestionToControl(
      'suggestion:multistep:key:code:Meta+Shift+S->app:claude->key:claude:Control+V->app:code',
      2
    )

    expect(result).not.toBeNull()
    expect(result?.suggestion.status).toBe('accepted')

    const updatedControl = result?.profile.controls.find((c) => c.slot === 2)
    expect(updatedControl?.action.type).toBe('macro')
    if (updatedControl?.action.type === 'macro') {
      const macroRow = getDatabase()
        .prepare('SELECT * FROM macros WHERE id = ?')
        .get(updatedControl.action.macroId) as { actions: string } | undefined
      expect(macroRow).toBeDefined()
      expect(JSON.parse(macroRow!.actions)).toEqual([
        { type: 'shortcut', keys: ['Meta', 'Shift', 'S'] },
        { type: 'focusApplication', applicationId: 'claude' },
        { type: 'shortcut', keys: ['Control', 'V'] },
        // The trailing "switch back to code" step is dropped (it's what the
        // workflow leads to, not part of doing it) and a submit keystroke
        // is appended because the chain ends in a paste.
        { type: 'shortcut', keys: ['Enter'] }
      ])
    }
  })

  it('does not append a submit keystroke when the chain does not end in a paste', () => {
    insertSuggestionIfNew(
      workflowSuggestion({
        id: 'suggestion:multistep:no-paste',
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [
            { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
            { type: 'appSwitch', applicationId: 'claude' },
            { type: 'shortcut', applicationId: 'claude', comboKeys: ['Control', 'Shift', 'L'] }
          ]
        }
      })
    )

    const result = assignSuggestionToControl('suggestion:multistep:no-paste', 3)
    const updatedControl = result?.profile.controls.find((c) => c.slot === 3)
    if (updatedControl?.action.type === 'macro') {
      const macroRow = getDatabase()
        .prepare('SELECT * FROM macros WHERE id = ?')
        .get(updatedControl.action.macroId) as { actions: string }
      expect(JSON.parse(macroRow.actions)).toEqual([
        { type: 'shortcut', keys: ['Meta', 'Shift', 'S'] },
        { type: 'focusApplication', applicationId: 'claude' },
        { type: 'shortcut', keys: ['Control', 'Shift', 'L'] }
      ])
    } else {
      expect.fail('expected a macro action')
    }
  })

  it('turns a click step into a real click MacroStep; never silently folded into focusApplication', () => {
    insertSuggestionIfNew(
      workflowSuggestion({
        id: 'suggestion:multistep:click',
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [
            { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
            { type: 'click', applicationId: 'code', target: 'zone:8x5' }
          ]
        }
      })
    )

    const result = assignSuggestionToControl('suggestion:multistep:click', 4)
    const updatedControl = result?.profile.controls.find((c) => c.slot === 4)
    if (updatedControl?.action.type === 'macro') {
      const macroRow = getDatabase()
        .prepare('SELECT * FROM macros WHERE id = ?')
        .get(updatedControl.action.macroId) as { actions: string }
      expect(JSON.parse(macroRow.actions)).toEqual([
        { type: 'shortcut', keys: ['Meta', 'Shift', 'S'] },
        { type: 'click', target: 'zone:8x5', applicationId: 'code' }
      ])
    } else {
      expect.fail('expected a macro action')
    }
  })

  it('inserts a real delay step from stepDelaysMs, clamped to the replay ceiling, skipping tiny gaps', () => {
    insertSuggestionIfNew(
      workflowSuggestion({
        id: 'suggestion:multistep:timed',
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [
            { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
            { type: 'appSwitch', applicationId: 'claude' },
            { type: 'shortcut', applicationId: 'claude', comboKeys: ['Control', 'Shift', 'L'] }
          ],
          // [0] is a placeholder; [1] is a real 5s gap (clamped down to the
          // 2s replay ceiling); [2] is a real but tiny 120ms gap, under the
          // floor natural pacing already covers; no explicit delay for it.
          stepDelaysMs: [0, 5000, 120]
        }
      })
    )

    const result = assignSuggestionToControl('suggestion:multistep:timed', 1)
    const updatedControl = result?.profile.controls.find((c) => c.slot === 1)
    if (updatedControl?.action.type === 'macro') {
      const macroRow = getDatabase()
        .prepare('SELECT * FROM macros WHERE id = ?')
        .get(updatedControl.action.macroId) as { actions: string }
      expect(JSON.parse(macroRow.actions)).toEqual([
        { type: 'shortcut', keys: ['Meta', 'Shift', 'S'] },
        { type: 'delay', ms: 2000 },
        { type: 'focusApplication', applicationId: 'claude' },
        { type: 'shortcut', keys: ['Control', 'Shift', 'L'] }
      ])
    } else {
      expect.fail('expected a macro action')
    }
  })
})

describe('assignSuggestionToControl; failure cases (fail closed, never guess)', () => {
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

describe('buildWorkflowMacroSteps', () => {
  it('keeps a workflow made only of app switches instead of trimming it to nothing', () => {
    const steps = buildWorkflowMacroSteps(
      [
        { type: 'appSwitch', applicationId: 'code' },
        { type: 'appSwitch', applicationId: 'githubdesktop' }
      ],
      [0, 10528]
    )
    expect(steps).toEqual([
      { type: 'focusApplication', applicationId: 'code' },
      { type: 'delay', ms: 2000 },
      { type: 'focusApplication', applicationId: 'githubdesktop' }
    ])
  })
})

describe('assignSuggestionToControl; workflows that must do something', () => {
  it('names an app-switch-only workflow after the real application names and labels the control for its destination', () => {
    insertSuggestionIfNew(
      workflowSuggestion({
        id: 'suggestion:switch-only',
        chainApplicationNames: { code: 'Visual Studio Code', githubdesktop: 'GitHub Desktop' },
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [
            { type: 'appSwitch', applicationId: 'code' },
            { type: 'appSwitch', applicationId: 'githubdesktop' }
          ]
        }
      })
    )

    const result = assignSuggestionToControl('suggestion:switch-only', 1)
    const control = result?.profile.controls.find((c) => c.slot === 1)
    expect(control?.label).toBe('GitHub Desk…')
    if (control?.action.type === 'macro') {
      const row = getDatabase().prepare('SELECT name FROM macros WHERE id = ?').get(control.action.macroId) as { name: string }
      expect(row.name).toBe('Visual Studio Code → GitHub Desktop')
    }
  })

  it('fails closed, leaving the suggestion pending, when no step would do anything', () => {
    insertSuggestionIfNew(
      workflowSuggestion({
        id: 'suggestion:inert',
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [
            { type: 'appSwitch', applicationId: '' },
            { type: 'appSwitch', applicationId: '' }
          ]
        }
      })
    )

    expect(assignSuggestionToControl('suggestion:inert', 1)).toBeNull()
    expect(getSuggestionById('suggestion:inert')?.status).toBe('pending')
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM macros').get()).toEqual({ n: 0 })
  })
})
