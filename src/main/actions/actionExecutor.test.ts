import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { UiohookKey } from 'uiohook-napi'
import { __setDatabaseForTesting, runMigrations } from '../database/db'
import {
  executeControlAction,
  isBlockedShortcut,
  isKeystrokeExecutionEnabled,
  isKnownFlowAction,
  resolveShortcutParts
} from './actionExecutor'

// Everything here is deliberately chosen to never touch a real window:
// invalid handles (IsWindow() safely returns false for a made-up number),
// null handles, unrecognized key names, and blocked/unknown actions all
// return before any real Win32 call that could affect this machine — no
// synthetic keystroke, no WM_CLOSE, no volume change ever actually fires
// during this test run.

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('isKeystrokeExecutionEnabled', () => {
  it('is enabled (see the comment at its definition for the redesign that made this safe again)', () => {
    expect(isKeystrokeExecutionEnabled()).toBe(true)
  })
})

describe('resolveShortcutParts', () => {
  it('resolves a single-key combo with no modifiers', () => {
    expect(resolveShortcutParts(['F5'])).toEqual({
      modifierCodes: [],
      triggerCode: UiohookKey.F5
    })
  })

  it('resolves a modifier + trigger combo', () => {
    expect(resolveShortcutParts(['Control', 'S'])).toEqual({
      modifierCodes: [UiohookKey.Ctrl],
      triggerCode: UiohookKey.S
    })
  })

  it('resolves a multi-modifier combo, preserving modifier order', () => {
    expect(resolveShortcutParts(['Control', 'Shift', 'P'])).toEqual({
      modifierCodes: [UiohookKey.Ctrl, UiohookKey.Shift],
      triggerCode: UiohookKey.P
    })
  })

  it('returns null for an empty combo', () => {
    expect(resolveShortcutParts([])).toBeNull()
  })

  it('returns null when the trigger key is not in the vocabulary', () => {
    expect(resolveShortcutParts(['Control', 'not-a-real-key'])).toBeNull()
  })

  it('returns null when a modifier is not in the vocabulary', () => {
    expect(resolveShortcutParts(['not-a-real-modifier', 'S'])).toBeNull()
  })
})

describe('isBlockedShortcut', () => {
  it('blocks the combos that can close a window or quit an application', () => {
    expect(isBlockedShortcut(['Alt', 'F4'])).toBe(true)
    expect(isBlockedShortcut(['Control', 'W'])).toBe(true)
    expect(isBlockedShortcut(['Control', 'Shift', 'W'])).toBe(true)
    expect(isBlockedShortcut(['Control', 'Q'])).toBe(true)
    expect(isBlockedShortcut(['Control', 'F4'])).toBe(true)
  })

  it('is order-independent', () => {
    expect(isBlockedShortcut(['F4', 'Alt'])).toBe(true)
    expect(isBlockedShortcut(['W', 'Shift', 'Control'])).toBe(true)
  })

  it('does not block ordinary shortcuts', () => {
    expect(isBlockedShortcut(['Control', 'S'])).toBe(false)
    expect(isBlockedShortcut(['Control', 'F5'])).toBe(false)
    expect(isBlockedShortcut(['Control', 'T'])).toBe(false)
  })
})

describe('executeControlAction — shortcut', () => {
  it('refuses a window-closing combo without attempting to focus anything', async () => {
    const result = await executeControlAction(
      { type: 'shortcut', keys: ['Control', 'W'] },
      // Even a plausible-looking handle must never be touched for a
      // blocked combo — the block is checked before any focus attempt.
      999999999
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Control+W')
  })

  it('fails closed when the target window handle is invalid', async () => {
    // A made-up handle is guaranteed not to be a real window. IsWindow()
    // returns false for it — a safe, read-only query — and execution
    // must refuse rather than send anywhere.
    const result = await executeControlAction(
      { type: 'shortcut', keys: ['Control', 'S'] },
      999999999
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Could not confirm focus')
  })

  it('refuses an unrecognized key name', async () => {
    const result = await executeControlAction(
      { type: 'shortcut', keys: ['Control', 'not-a-real-key'] },
      null // no target window, so this exercises sendShortcut directly
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Unrecognized key')
  })
})

describe('executeControlAction — macro', () => {
  it('refuses when the macro does not exist', async () => {
    const result = await executeControlAction({ type: 'macro', macroId: 'does-not-exist' }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Macro not found')
  })
})

describe('isKnownFlowAction', () => {
  it('recognizes closeWindow', () => {
    expect(isKnownFlowAction('closeWindow')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isKnownFlowAction('doSomethingElse')).toBe(false)
    expect(isKnownFlowAction('')).toBe(false)
  })
})

describe('executeControlAction — flowAction: closeWindow', () => {
  it('refuses to close when there is no known target window', async () => {
    const result = await executeControlAction({ type: 'flowAction', action: 'closeWindow' }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('No known target window')
  })

  it('refuses an unimplemented flowAction', async () => {
    const result = await executeControlAction(
      { type: 'flowAction', action: 'somethingNotBuiltYet' },
      12345
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('not implemented yet')
  })
})
