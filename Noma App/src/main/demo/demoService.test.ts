import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { getWorkflowEventsSince, insertWorkflowEvent } from '../database/repositories/workflowEventsRepository'
import { insertSuggestionIfNew } from '../database/repositories/suggestionsRepository'
import { createMacro } from '../database/repositories/macrosRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { detectPatterns } from '../workflow/patternDetection'
import { markDemoSuggestions, resetDemoData, simulateDemoMultiStepWorkflow, simulateDemoWorkflow } from './demoService'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import type { Suggestion } from '@shared/types'
import { DEMO_MACRO_TRIGGER, LEARNED_MACRO_TRIGGER } from '@shared/constants'

/** The seed's Chrome FIND is Ctrl+F on Windows and Cmd+F on macOS. */
const PRIMARY_MODIFIER = process.platform === 'darwin' ? 'Meta' : 'Control'

/** Mirrors database/seed.ts's SEED_APPLICATIONS for 'code' and 'chrome'
 *  demoService.resetDemoData relies on getSeedDefaultControl, which reads
 *  those exact rows, so the test DB's starting controls must match. */
function seedDemoProfiles(): void {
  const db = getDatabase()
  const insertApplication = db.prepare(
    'INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)'
  )
  const insertProfile = db.prepare('INSERT INTO profiles (id, application_id, name) VALUES (?, ?, ?)')
  const insertControl = db.prepare(
    `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  insertApplication.run('code', 'Visual Studio Code', 'Code.exe')
  insertProfile.run('code-default', 'code', 'Developer')
  insertControl.run('code-1', 'code-default', 1, 'RUN', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'F5'] }))
  insertControl.run('code-2', 'code-default', 2, 'DEBUG', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['F5'] }))
  insertControl.run('code-3', 'code-default', 3, 'TERMINAL', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'Backquote'] }))
  insertControl.run('code-4', 'code-default', 4, 'SEARCH', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'Shift', 'F'] }))

  insertApplication.run('chrome', 'Google Chrome', 'chrome.exe')
  insertProfile.run('chrome-default', 'chrome', 'Browsing')
  insertControl.run('chrome-1', 'chrome-default', 1, 'NEW TAB', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'T'] }))
  insertControl.run('chrome-2', 'chrome-default', 2, 'CLOSE WINDOW', 'flowAction', JSON.stringify({ type: 'flowAction', action: 'closeWindow' }))
  insertControl.run('chrome-3', 'chrome-default', 3, 'RELOAD', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'R'] }))
  insertControl.run('chrome-4', 'chrome-default', 4, 'FIND', 'shortcut', JSON.stringify({ type: 'shortcut', keys: ['Control', 'F'] }))
}

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
  seedDemoProfiles()
})

describe('simulateDemoWorkflow', () => {
  it('produces exactly one repeatedSequence pattern for Chrome, and no repeatedShortcut patterns', () => {
    simulateDemoWorkflow()

    const events = getWorkflowEventsSince(0)
    const patterns = detectPatterns(events)

    const sequencePatterns = patterns.filter((p) => p.kind === 'repeatedSequence')
    const shortcutPatterns = patterns.filter((p) => p.kind === 'repeatedShortcut')

    expect(sequencePatterns).toHaveLength(1)
    expect(sequencePatterns[0].applicationId).toBe('chrome')
    expect(sequencePatterns[0].count).toBeGreaterThanOrEqual(3)
    if (sequencePatterns[0].kind === 'repeatedSequence') {
      expect(sequencePatterns[0].sequence).toEqual(['Control+D', 'Control+W'])
    }

    // Deliberately tuned to stay under the repeatedShortcut threshold so the
    // demo shows exactly one clean suggestion: see demoService.ts's doc
    // comment on REPEAT_COUNT.
    expect(shortcutPatterns).toHaveLength(0)
  })

  it('is repeatable; reset then simulate again produces the exact same result', () => {
    simulateDemoWorkflow()
    const firstRun = detectPatterns(getWorkflowEventsSince(0)).filter(
      (p) => p.kind === 'repeatedSequence'
    )

    resetDemoData()
    simulateDemoWorkflow()
    const secondRun = detectPatterns(getWorkflowEventsSince(0)).filter(
      (p) => p.kind === 'repeatedSequence'
    )

    expect(secondRun).toHaveLength(1)
    expect(secondRun[0].count).toBe(firstRun[0].count)
  })
})

describe('simulateDemoMultiStepWorkflow (WORKFLOW LEARNING flagship demo)', () => {
  it('produces exactly one multiStepWorkflow suggestion pattern, starting in VS Code', () => {
    simulateDemoMultiStepWorkflow()

    const events = getWorkflowEventsSince(0)
    const patterns = detectPatterns(events)
    const workflows = patterns.filter((p) => p.kind === 'multiStepWorkflow')

    expect(workflows).toHaveLength(1)
    const workflow = workflows[0]
    expect(workflow.count).toBeGreaterThanOrEqual(3)
    if (workflow.kind === 'multiStepWorkflow') {
      expect(workflow.contextApplicationId).toBe('code')
      expect(workflow.consistency).toBe(1)
    }
  })

  it('does not also surface the redundant crossAppWorkflow pairs (subsumed by the fuller chain)', () => {
    simulateDemoMultiStepWorkflow()
    const patterns = detectPatterns(getWorkflowEventsSince(0))
    expect(patterns.filter((p) => p.kind === 'crossAppWorkflow')).toHaveLength(0)
  })

  it('gives Claude Code a real applications row, for the eventual macro and suggestion copy', () => {
    simulateDemoMultiStepWorkflow()
    expect(getApplicationById('claude')).toEqual({
      id: 'claude',
      name: 'Claude Code',
      processName: 'Claude.exe',
      icon: undefined
    })
  })

  it('is repeatable; reset then simulate again produces the exact same result', () => {
    simulateDemoMultiStepWorkflow()
    const first = detectPatterns(getWorkflowEventsSince(0)).filter((p) => p.kind === 'multiStepWorkflow')

    resetDemoData()
    simulateDemoMultiStepWorkflow()
    const second = detectPatterns(getWorkflowEventsSince(0)).filter((p) => p.kind === 'multiStepWorkflow')

    expect(second).toHaveLength(1)
    expect(second[0].count).toBe(first[0].count)
  })
})

describe('resetDemoData', () => {
  const realSuggestion = {
    id: 'suggestion:sequence:chrome::Control+S->Control+T',
    title: 'Create a macro for this sequence?',
    explanation: '...',
    confidence: 0.6,
    status: 'pending',
    createdAt: Date.now(),
    applicationId: 'chrome',
    action: { kind: 'createMacroAndAssignToControl', sequence: ['Control+S', 'Control+T'] }
  } as Suggestion

  it('removes the demo events and suggestions, and nothing Noma really observed', () => {
    insertWorkflowEvent({ applicationId: 'chrome', eventType: 'shortcut', comboKeys: ['Control', 'S'], timestamp: 1 })
    simulateDemoWorkflow()
    insertSuggestionIfNew(realSuggestion)
    insertSuggestionIfNew({ ...realSuggestion, id: 'demo', action: { kind: 'createMacroAndAssignToControl', sequence: ['Control+D', 'Control+W'] } } as Suggestion)
    markDemoSuggestions()

    resetDemoData()

    expect(getWorkflowEventsSince(0)).toHaveLength(1)
    const remaining = getDatabase().prepare('SELECT id FROM suggestions').all() as Array<{ id: string }>
    expect(remaining.map((row) => row.id)).toEqual([realSuggestion.id])
  })

  it("leaves the user's own control changes alone", () => {
    const chromeProfile = getProfileForApplicationId('chrome')!
    assignControlAction(chromeProfile.id, 4, 'CUSTOM', { type: 'shortcut', keys: ['Control', 'Z'] })

    resetDemoData()

    const slot4 = getProfileForApplicationId('chrome')!.controls.find((c) => c.slot === 4)
    expect(slot4?.label).toBe('CUSTOM')
  })

  it('removes a workflow saved from a demo suggestion and restores its control', () => {
    const chromeProfile = getProfileForApplicationId('chrome')!
    const macro = createMacro({
      name: 'Bookmark → Close tab',
      applicationId: 'chrome',
      trigger: DEMO_MACRO_TRIGGER,
      actions: [
        { type: 'shortcut', keys: ['Control', 'D'] },
        { type: 'shortcut', keys: ['Control', 'W'] }
      ],
      delayMs: 0,
      enabled: true
    })
    assignControlAction(chromeProfile.id, 4, macro.name, { type: 'macro', macroId: macro.id })

    resetDemoData()

    expect(getDatabase().prepare('SELECT * FROM macros WHERE id = ?').get(macro.id)).toBeUndefined()
    expect(getProfileForApplicationId('chrome')!.controls.find((c) => c.slot === 4)?.action).toEqual({
      type: 'shortcut',
      keys: [PRIMARY_MODIFIER, 'F']
    })
  })

  it('keeps a workflow saved from a real suggestion', () => {
    const macro = createMacro({
      name: 'Save → New tab',
      applicationId: 'chrome',
      trigger: LEARNED_MACRO_TRIGGER,
      actions: [{ type: 'shortcut', keys: ['Control', 'S'] }],
      delayMs: 0,
      enabled: true
    })

    resetDemoData()

    expect(getDatabase().prepare('SELECT * FROM macros WHERE id = ?').get(macro.id)).toBeDefined()
  })

  it('is safe to call when the demo profiles do not exist', () => {
    getDatabase().prepare('DELETE FROM applications').run()
    expect(() => resetDemoData()).not.toThrow()
  })
})

describe('markDemoSuggestions', () => {
  it("flags only suggestions made of a demo workflow's pieces", () => {
    simulateDemoWorkflow()
    insertSuggestionIfNew({ id: 'real', title: 't', explanation: 'e', confidence: 0.6, status: 'pending', createdAt: 1, applicationId: 'chrome', action: { kind: 'assignShortcutToControl', comboKeys: ['Control', 'S'] } } as Suggestion)
    insertSuggestionIfNew({ id: 'demo', title: 't', explanation: 'e', confidence: 0.6, status: 'pending', createdAt: 1, applicationId: 'chrome', action: { kind: 'createMacroAndAssignToControl', sequence: ['Control+D', 'Control+W'] } } as Suggestion)

    markDemoSuggestions()

    const flags = getDatabase().prepare('SELECT id, is_demo FROM suggestions ORDER BY id').all()
    expect(flags).toEqual([
      { id: 'demo', is_demo: 1 },
      { id: 'real', is_demo: 0 }
    ])
  })

  it("marks the demo's scripted events, so the reset can tell them apart", () => {
    simulateDemoMultiStepWorkflow()
    const rows = getDatabase().prepare('SELECT DISTINCT is_demo FROM workflow_events').all()
    expect(rows).toEqual([{ is_demo: 1 }])
  })
})
