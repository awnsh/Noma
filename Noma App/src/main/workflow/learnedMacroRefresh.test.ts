import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { isMac } from '../platform'
import type { DetectedPattern } from '@shared/types'
import { LEARNED_MACRO_TRIGGER } from '@shared/constants'
import { __setDatabaseForTesting, runMigrations } from '../database/db'
import { createMacro, getMacroById, updateMacro } from '../database/repositories/macrosRepository'
import { refreshLearnedMacros } from './learnedMacroRefresh'

/** This platform's region screenshot: Win+Shift+S, or Ctrl+Cmd+Shift+4 on a Mac. */
const SHOT = isMac ? ['Control', 'Meta', 'Shift', '4'] : ['Meta', 'Shift', 'S']
/** This OS's paste: a workflow ending in one gets an Enter appended. */
const PASTE = isMac ? ['Meta', 'V'] : ['Control', 'V']

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

const area = { x: 10, y: 20, width: 300, height: 200 }

/** The real workflow from 2026-10-09: Chrome, snip, back to Chrome, paste. */
function pattern(): DetectedPattern {
  return {
    id: 'multistep:x',
    kind: 'multiStepWorkflow',
    applicationId: 'chrome',
    applicationIds: ['chrome', 'snippingtool'],
    contextApplicationId: 'chrome',
    steps: [
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: SHOT, region: area },
      { type: 'appSwitch', applicationId: 'snippingtool' },
      { type: 'appSwitch', applicationId: 'chrome' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: PASTE, tab: 'chat' }
    ],
    description: 'd',
    count: 3,
    sessionCount: 1,
    consistency: 1,
    stepDelaysMs: [0, 689, 800, 900, 1297]
  }
}

function savedWorkflow(trigger = LEARNED_MACRO_TRIGGER) {
  return createMacro({
    name: 'Google Chrome → Screenshot → … → Paste',
    trigger,
    delayMs: 0,
    enabled: true,
    actions: [
      { type: 'focusApplication', applicationId: 'chrome' },
      { type: 'delay', ms: 689 },
      { type: 'shortcut', keys: SHOT },
      { type: 'focusApplication', applicationId: 'chrome' },
      { type: 'delay', ms: 1297 },
      { type: 'shortcut', keys: PASTE },
      { type: 'shortcut', keys: ['Enter'] }
    ]
  })
}

describe('refreshLearnedMacros', () => {
  it('gives a saved learned workflow the tabs and screenshot area seen doing it again', () => {
    const macro = savedWorkflow()
    expect(refreshLearnedMacros([pattern()])).toBe(1)
    expect(getMacroById(macro.id)?.actions).toEqual([
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'delay', ms: 689 },
      { type: 'shortcut', keys: SHOT, region: area },
      { type: 'focusApplication', applicationId: 'chrome' },
      { type: 'delay', ms: 1297 },
      { type: 'shortcut', keys: PASTE, tab: 'chat' },
      { type: 'shortcut', keys: ['Enter'] }
    ])
    // Nothing new the second time.
    expect(refreshLearnedMacros([pattern()])).toBe(0)
  })

  it('never replaces an area that was picked, and leaves macros the user wrote alone', () => {
    const picked = { x: 1, y: 2, width: 50, height: 60 }
    const learned = savedWorkflow()
    const actions = getMacroById(learned.id)!.actions.map((step, index) => (index === 2 && step.type === 'shortcut' ? { ...step, region: picked } : step))
    updateMacro(learned.id, { actions })
    const authored = savedWorkflow('manual')
    refreshLearnedMacros([pattern()])
    expect(getMacroById(learned.id)?.actions[2]).toEqual({ type: 'shortcut', keys: SHOT, region: picked })
    expect(getMacroById(authored.id)?.actions[2]).toEqual({ type: 'shortcut', keys: SHOT })
  })
})
