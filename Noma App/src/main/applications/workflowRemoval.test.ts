import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Suggestion } from '@shared/types'
import { __setDatabaseForTesting, getDatabase, runMigrations } from '../database/db'
import { seedDefaultProfiles } from '../database/seed'
import { createMacro, getMacroById } from '../database/repositories/macrosRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { createProfileForApplication } from './profileCreation'
import { removeLearnedWorkflow } from './workflowRemoval'

/** Seeded starter actions and key names follow the OS: Ctrl/Win on
 *  Windows, Cmd on macOS. */
const isMacRun = process.platform === 'darwin'

// The preview pulls in the executor, which loads the native input hook.
vi.mock('uiohook-napi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('uiohook-napi')>()
  return { ...actual, uIOhook: { ...actual.uIOhook, keyTap: vi.fn() } }
})
const { previewSuggestion } = await import('./workflowPreview')

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  seedDefaultProfiles(db)
  __setDatabaseForTesting(db)
})

function saveWorkflowOn(applicationId: string, slot: number): string {
  const macro = createMacro({
    name: 'Bookmark → Close tab',
    applicationId,
    trigger: 'flow-control',
    actions: [{ type: 'shortcut', keys: ['Control', 'D'] }],
    delayMs: 0,
    enabled: true
  })
  assignControlAction(getProfileForApplicationId(applicationId)!.id, slot, 'BOOKMARK', { type: 'macro', macroId: macro.id })
  return macro.id
}

describe('removeLearnedWorkflow', () => {
  it('deletes the workflow and puts a seeded app’s zone back to its starter action', () => {
    const id = saveWorkflowOn('chrome', 1)
    expect(removeLearnedWorkflow(id)).toEqual({ applicationIds: ['chrome'] })
    expect(getMacroById(id)).toBeNull()
    const slot1 = getProfileForApplicationId('chrome')!.controls.find((c) => c.slot === 1)
    expect(slot1).toMatchObject({ label: 'NEW TAB', action: { type: 'shortcut', keys: [isMacRun ? 'Meta' : 'Control', 'T'] } })
  })

  it('empties the zone in an app with no starter actions, never leaving a dangling workflow', () => {
    createProfileForApplication({ id: 'notepad', name: 'Notepad', processName: 'notepad.exe' }, 'Notepad')
    const id = saveWorkflowOn('notepad', 3)
    removeLearnedWorkflow(id)
    const slot3 = getProfileForApplicationId('notepad')!.controls.find((c) => c.slot === 3)
    expect(slot3).toMatchObject({ label: 'SLOT 3', action: { type: 'shortcut', keys: [] } })
  })

  it('returns null for an unknown workflow and changes nothing', () => {
    expect(removeLearnedWorkflow('nope')).toBeNull()
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM controls').get()).toEqual({ n: 12 })
  })
})

function suggestion(action: Suggestion['action']): Suggestion {
  return { id: 's', title: 't', explanation: 'e', confidence: 0.7, status: 'pending', createdAt: 1, applicationId: 'code', action }
}

describe('previewSuggestion', () => {
  it('lists every step that will run, including the Enter Noma adds after a final paste', () => {
    getDatabase().prepare("INSERT INTO applications (id, name, process_name) VALUES ('claude', 'Claude Code', 'Claude.exe')").run()
    const preview = previewSuggestion(
      suggestion({
        kind: 'createWorkflowMacroAndAssignToControl',
        steps: [
          { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
          { type: 'appSwitch', applicationId: 'claude' },
          { type: 'shortcut', applicationId: 'claude', comboKeys: ['Control', 'V'] }
        ]
      })
    )!
    expect(preview.steps.map((step) => step.description)).toEqual([
      `Screenshot (${isMacRun ? 'Cmd' : 'Win'}+Shift+S)`,
      'Switch to Claude Code (it has to be open already)',
      'Paste (Ctrl+V)',
      'Press Enter, to send what was pasted'
    ])
    expect(preview.steps[3].added).toBe(true)
    expect(preview.replayable).toBe(true)
  })

  it('warns about steps that can’t replay reliably instead of hiding them', () => {
    const preview = previewSuggestion(
      suggestion({
        kind: 'createWorkflowMacroAndAssignToControl',
        steps: [
          { type: 'click', applicationId: 'code', target: 'zone:1x1' },
          { type: 'appSwitch', applicationId: null },
          { type: 'shortcut', applicationId: 'code', comboKeys: ['Control', 'S'] }
        ]
      })
    )!
    expect(preview.steps[0].warning).toMatch(/by position/)
    expect(preview.steps[1].warning).toMatch(/doesn’t know which app/)
    expect(preview.replayable).toBe(false)
  })

  it('previews a plain shortcut sequence, and nothing for a suggestion without an action', () => {
    expect(previewSuggestion(suggestion({ kind: 'createMacroAndAssignToControl', sequence: ['Control+D', 'Control+W'] }))!.steps).toHaveLength(2)
    expect(previewSuggestion(suggestion(undefined))).toBeNull()
  })
})
