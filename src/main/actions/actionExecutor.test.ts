import { describe, expect, it } from 'vitest'
import { UiohookKey } from 'uiohook-napi'
import {
  executeControlAction,
  isBlockedShortcut,
  isKnownFlowAction,
  resolveShortcutParts
} from './actionExecutor'

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

describe('executeControlAction — keystroke execution is disabled (two real crashes)', () => {
  it('refuses an ordinary shortcut without attempting to focus or send anything', async () => {
    const result = await executeControlAction(
      { type: 'shortcut', keys: ['Control', 'R'] },
      // A bogus handle: if the focus dance were reached, it would spawn a
      // real PowerShell process and hang/fail slowly. An immediate refusal
      // proves the disabled-execution gate short-circuits before that.
      999999999
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('disabled')
  })

  it('refuses a blocked (window-closing) shortcut too, for the same reason', async () => {
    const result = await executeControlAction({ type: 'shortcut', keys: ['Control', 'W'] }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('disabled')
  })

  it('refuses a macro without looking it up or attempting to send it', async () => {
    const result = await executeControlAction(
      { type: 'macro', macroId: 'does-not-matter-should-never-be-looked-up' },
      null
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('disabled')
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
