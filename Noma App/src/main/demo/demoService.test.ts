import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { getWorkflowEventsSince } from '../database/repositories/workflowEventsRepository'
import { insertSuggestionIfNew } from '../database/repositories/suggestionsRepository'
import { createMacro } from '../database/repositories/macrosRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { detectPatterns } from '../workflow/patternDetection'
import { resetDemoData, simulateDemoWorkflow } from './demoService'
import type { Suggestion } from '@shared/types'

/** Mirrors database/seed.ts's SEED_APPLICATIONS for 'code' and 'chrome' —
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
      expect(sequencePatterns[0].sequence).toEqual(['Control+C', 'Control+V'])
    }

    // Deliberately tuned to stay under the repeatedShortcut threshold so the
    // demo shows exactly one clean suggestion — see demoService.ts's doc
    // comment on REPEAT_COUNT.
    expect(shortcutPatterns).toHaveLength(0)
  })

  it('is repeatable — reset then simulate again produces the exact same result', () => {
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

describe('resetDemoData', () => {
  it('clears workflow events and suggestions', () => {
    simulateDemoWorkflow()
    insertSuggestionIfNew({
      id: 'suggestion:sequence:chrome::Control+C->Control+V',
      title: 'Create a macro for this sequence?',
      explanation: '...',
      confidence: 0.6,
      status: 'pending',
      createdAt: Date.now(),
      applicationId: 'chrome'
    } as Suggestion)

    resetDemoData()

    expect(getWorkflowEventsSince(0)).toHaveLength(0)
    const remainingSuggestions = getDatabase().prepare('SELECT COUNT(*) as count FROM suggestions').get() as {
      count: number
    }
    expect(remainingSuggestions.count).toBe(0)
  })

  it('restores both demo profiles to their seeded controls', () => {
    const chromeProfile = getProfileForApplicationId('chrome')!
    assignControlAction(chromeProfile.id, 4, 'CUSTOM', { type: 'shortcut', keys: ['Control', 'Z'] })

    resetDemoData()

    const restored = getProfileForApplicationId('chrome')!
    const slot4 = restored.controls.find((c) => c.slot === 4)
    expect(slot4?.label).toBe('FIND')
    expect(slot4?.action).toEqual({ type: 'shortcut', keys: ['Control', 'F'] })
  })

  it('deletes a macro left assigned to a demo control by a previous run', () => {
    const chromeProfile = getProfileForApplicationId('chrome')!
    const macro = createMacro({
      name: 'Control+C → Control+V',
      applicationId: 'chrome',
      trigger: 'flow-control',
      actions: [
        { type: 'shortcut', keys: ['Control', 'C'] },
        { type: 'shortcut', keys: ['Control', 'V'] }
      ],
      delayMs: 0,
      enabled: true
    })
    assignControlAction(chromeProfile.id, 4, macro.name, { type: 'macro', macroId: macro.id })

    resetDemoData()

    const macroRow = getDatabase().prepare('SELECT * FROM macros WHERE id = ?').get(macro.id)
    expect(macroRow).toBeUndefined()

    const restored = getProfileForApplicationId('chrome')!
    expect(restored.controls.find((c) => c.slot === 4)?.action).toEqual({
      type: 'shortcut',
      keys: ['Control', 'F']
    })
  })

  it('is safe to call when the demo profiles do not exist', () => {
    getDatabase().exec('DELETE FROM profiles; DELETE FROM applications;')
    expect(() => resetDemoData()).not.toThrow()
  })
})
