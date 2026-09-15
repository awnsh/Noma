import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UiohookKey, uIOhook } from 'uiohook-napi'
import type { MacroStep } from '@shared/types'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { createMacro } from '../database/repositories/macrosRepository'
import { __resetSelfInjectedGuardForTesting, isSelfInjected } from '../workflow/selfInjectedKeys'
import { findMainWindowHandleForProcess } from './processWindow'
import { focusWindowAndVerify } from './windowFocus'
import {
  executeControlAction,
  executeMacroSteps,
  isBlockedShortcut,
  isKeystrokeExecutionEnabled,
  isKnownFlowAction,
  resolveShortcutParts
} from './actionExecutor'

// uIOhook.keyTap is the one real Win32-affecting call a *successful*
// shortcut send makes (see the "marks the combo as self-injected" tests
// below, which deliberately do reach it) — mocked so this suite never
// actually sends a synthetic keystroke to whatever window happens to have
// focus while it runs. Every other test here is chosen to return before
// reaching it at all (invalid handles, unrecognized keys, blocked/unknown
// actions), so this mock changes nothing about their behavior.
vi.mock('uiohook-napi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('uiohook-napi')>()
  return { ...actual, uIOhook: { ...actual.uIOhook, keyTap: vi.fn() } }
})

// findMainWindowHandleForProcess spawns a real PowerShell process to query
// running windows — mocked here so `focusApplication` tests are fast and
// deterministic instead of depending on what's actually running on the
// machine running this suite. processWindow.test.ts covers the real thing.
vi.mock('./processWindow', () => ({ findMainWindowHandleForProcess: vi.fn() }))

// focusWindowAndVerify itself is real Win32 I/O that windowFocus.test.ts
// already covers directly (fails closed for a made-up handle — see that
// file). Wrapped (not replaced) here so every existing test keeps exercising
// the real fail-closed behavior by default; only the one test below that
// needs a genuine "focus succeeded" path overrides it for that case.
vi.mock('./windowFocus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./windowFocus')>()
  return { ...actual, focusWindowAndVerify: vi.fn(actual.focusWindowAndVerify) }
})

function insertApplication(id: string, name: string, processName: string): void {
  getDatabase()
    .prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)')
    .run(id, name, processName)
}

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
  __resetSelfInjectedGuardForTesting()
  vi.mocked(uIOhook.keyTap).mockClear()
  vi.mocked(findMainWindowHandleForProcess).mockReset()
  vi.mocked(focusWindowAndVerify).mockClear() // keeps the real pass-through implementation
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

  it('no longer blocks plain Control+W — deliberately removed by explicit user request (2026-09-07), see the comment at BLOCKED_COMBOS', () => {
    expect(isBlockedShortcut(['Control', 'W'])).toBe(false)
  })
})

describe('executeControlAction — shortcut', () => {
  it('refuses a window-closing combo without attempting to focus anything', async () => {
    const result = await executeControlAction(
      { type: 'shortcut', keys: ['Control', 'Q'] },
      // Even a plausible-looking handle must never be touched for a
      // blocked combo — the block is checked before any focus attempt.
      999999999
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Control+Q')
  })

  it('sends plain Control+W as a real keystroke — deliberately unblocked (2026-09-07), see BLOCKED_COMBOS', async () => {
    const result = await executeControlAction({ type: 'shortcut', keys: ['Control', 'W'] }, null)
    expect(result.ok).toBe(true)
    expect(uIOhook.keyTap).toHaveBeenCalledTimes(1)
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

  it('refuses a not-yet-configured control (empty combo) with a clear reason, not a blank one', async () => {
    const result = await executeControlAction({ type: 'shortcut', keys: [] }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('This control has no shortcut set yet')
  })

  it('marks the combo as self-injected right before actually sending it', async () => {
    // No target window (null) — the same path a control press without a
    // real focused application takes — so this reaches the real send.
    const result = await executeControlAction({ type: 'shortcut', keys: ['Control', 'S'] }, null)

    expect(result.ok).toBe(true)
    expect(uIOhook.keyTap).toHaveBeenCalledTimes(1)
    // captureService.ts's hook would see this exact combo next — confirm
    // it's already marked so that echo gets ignored, not logged as real
    // user input. See selfInjectedKeys.ts.
    expect(isSelfInjected(['Control', 'S'])).toBe(true)
  })

  it('never marks a combo that was refused before reaching the real send', async () => {
    await executeControlAction({ type: 'shortcut', keys: ['Control', 'Q'] }, 999999999)
    expect(uIOhook.keyTap).not.toHaveBeenCalled()
    expect(isSelfInjected(['Control', 'Q'])).toBe(false)
  })
})

describe('executeControlAction — macro', () => {
  it('refuses when the macro does not exist', async () => {
    const result = await executeControlAction({ type: 'macro', macroId: 'does-not-exist' }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Macro not found')
  })
})

describe('executeMacroSteps', () => {
  it('waits out a delay step without treating it as a failure', async () => {
    const steps: MacroStep[] = [{ type: 'delay', ms: 1 }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(true)
  })

  it('refuses an unknown system command step', async () => {
    const steps: MacroStep[] = [{ type: 'systemCommand', command: 'notARealCommand' }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Unknown system command')
  })

  it('refuses a flowAction step with no known target window', async () => {
    const steps: MacroStep[] = [{ type: 'flowAction', action: 'closeWindow' }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('No known target window')
  })

  it('refuses a launchApplication step as not implemented yet', async () => {
    const steps: MacroStep[] = [{ type: 'launchApplication', applicationId: 'code' }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('not implemented yet')
  })

  it('refuses a blocked shortcut step the same way a direct shortcut control is refused', async () => {
    const steps: MacroStep[] = [{ type: 'shortcut', keys: ['Control', 'Q'] }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Control+Q')
  })

  it('marks each shortcut step as self-injected too, not just a direct control press', async () => {
    const steps: MacroStep[] = [{ type: 'shortcut', keys: ['Control', 'T'] }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(true)
    expect(isSelfInjected(['Control', 'T'])).toBe(true)
  })

  it('runs a nested macro step by resolving and executing the referenced macro', async () => {
    const inner = createMacro({
      name: 'Inner',
      trigger: 'manual',
      actions: [{ type: 'delay', ms: 1 }],
      delayMs: 0,
      enabled: true
    })
    const steps: MacroStep[] = [{ type: 'macro', macroId: inner.id }]
    const result = await executeMacroSteps(steps, null)
    expect(result.ok).toBe(true)
  })

  it('refuses a nested macro that is disabled', async () => {
    const inner = createMacro({
      name: 'Inner',
      trigger: 'manual',
      actions: [],
      delayMs: 0,
      enabled: false
    })
    const result = await executeMacroSteps([{ type: 'macro', macroId: inner.id }], null)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Macro is disabled')
  })

  it('refuses a macro step that references itself directly', async () => {
    const db = getDatabase()
    // Hand-construct a self-referencing macro directly in the DB — createMacro's
    // generated id isn't known until after the row exists.
    db.prepare(
      `INSERT INTO macros (id, name, trigger, actions, delay_ms, enabled)
       VALUES ('self', 'Self', 'manual', '[]', 0, 1)`
    ).run()
    db.prepare('UPDATE macros SET actions = ? WHERE id = ?').run(
      JSON.stringify([{ type: 'macro', macroId: 'self' }]),
      'self'
    )

    const result = await executeMacroSteps([{ type: 'macro', macroId: 'self' }], null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('references itself')
  })

  it('refuses nesting deeper than the max depth', async () => {
    // Build a chain of 5 macros, each referencing the next — deeper than
    // MAX_MACRO_NESTING_DEPTH (3), so this must be refused rather than
    // silently truncated or left to recurse indefinitely.
    const last = createMacro({
      name: 'Level 5',
      trigger: 'manual',
      actions: [{ type: 'delay', ms: 1 }],
      delayMs: 0,
      enabled: true
    })
    let previousId = last.id
    for (let level = 4; level >= 1; level--) {
      const macro = createMacro({
        name: `Level ${level}`,
        trigger: 'manual',
        actions: [{ type: 'macro', macroId: previousId }],
        delayMs: 0,
        enabled: true
      })
      previousId = macro.id
    }

    const result = await executeMacroSteps([{ type: 'macro', macroId: previousId }], null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('nest at most')
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

describe('focusApplication (WORKFLOW LEARNING — switching to an already-running app)', () => {
  it('fails closed for an unknown application id', async () => {
    const result = await executeControlAction({ type: 'focusApplication', applicationId: 'nope' }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Unknown application')
    expect(findMainWindowHandleForProcess).not.toHaveBeenCalled()
  })

  it('fails closed, with a clear reason, when the application is not currently running', async () => {
    insertApplication('claude', 'Claude Code', 'Claude.exe')
    vi.mocked(findMainWindowHandleForProcess).mockResolvedValue(null)

    const result = await executeControlAction({ type: 'focusApplication', applicationId: 'claude' }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("isn't currently running")
    expect(result.reason).toContain("doesn't launch applications")
    expect(findMainWindowHandleForProcess).toHaveBeenCalledWith('Claude.exe')
  })

  it('fails closed when a window handle is found but focus cannot be confirmed', async () => {
    insertApplication('claude', 'Claude Code', 'Claude.exe')
    // A made-up handle — guaranteed not to be a real window, so
    // IsWindow()/SetForegroundWindow() can never actually confirm focus.
    vi.mocked(findMainWindowHandleForProcess).mockResolvedValue(999999999)

    const result = await executeControlAction({ type: 'focusApplication', applicationId: 'claude' }, null)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Could not confirm focus')
  })

  it('never sends a keystroke when focusApplication fails inside a macro — stops at the failed step', async () => {
    insertApplication('claude', 'Claude Code', 'Claude.exe')
    vi.mocked(findMainWindowHandleForProcess).mockResolvedValue(null)

    const steps: MacroStep[] = [
      { type: 'focusApplication', applicationId: 'claude' },
      { type: 'shortcut', keys: ['Control', 'V'] }
    ]
    const result = await executeMacroSteps(steps, null)

    expect(result.ok).toBe(false)
    expect(uIOhook.keyTap).not.toHaveBeenCalled()
  })

  it('runs the remaining macro steps once focusApplication succeeds', async () => {
    insertApplication('claude', 'Claude Code', 'Claude.exe')
    vi.mocked(findMainWindowHandleForProcess).mockResolvedValue(4242)
    vi.mocked(focusWindowAndVerify).mockReturnValue(true) // simulates a real, confirmed focus switch

    const steps: MacroStep[] = [
      { type: 'shortcut', keys: ['Meta', 'Shift', 'S'] }, // screenshot
      { type: 'focusApplication', applicationId: 'claude' },
      { type: 'shortcut', keys: ['Control', 'V'] }, // paste
      { type: 'shortcut', keys: ['Enter'] } // submit
    ]
    const result = await executeMacroSteps(steps, null)

    expect(result.ok).toBe(true)
    expect(findMainWindowHandleForProcess).toHaveBeenCalledWith('Claude.exe')
    expect(focusWindowAndVerify).toHaveBeenCalledWith(4242)
    // 3 shortcut steps: screenshot, paste, enter — focusApplication itself
    // sends no keystroke.
    expect(uIOhook.keyTap).toHaveBeenCalledTimes(3)
  })
})
