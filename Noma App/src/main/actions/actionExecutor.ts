import { uIOhook } from 'uiohook-napi'
import { FLOW_ACTION_CATALOG } from '@shared/constants'
import type { ControlAction, MacroStep } from '@shared/types'
import { keyCodeForName } from '../workflow/keyNames'
import { markSelfInjected } from '../workflow/selfInjectedKeys'
import { getMacroById } from '../database/repositories/macrosRepository'
import { focusWindowAndVerify } from './windowFocus'
import { closeWindowGracefully } from './windowClose'
import { executeSystemCommand, isKnownSystemCommand } from './systemCommands'

/**
 * The only implemented flowAction so far. Deliberately the *safe*
 * replacement for sending Ctrl+W/Alt+F4 as a keystroke (see
 * BLOCKED_COMBOS below and windowClose.ts): posts WM_CLOSE — the same
 * message a title bar's X button sends — rather than simulating a
 * shortcut, so there's no keystroke, no focus-stealing, and no risk of a
 * forceful termination. The app being closed decides how to respond,
 * exactly as it would for a real click on X.
 *
 * The set of valid *names* is shared with the renderer (FLOW_ACTION_CATALOG)
 * so the Control Mapping Editor's dropdown can't list something this
 * refuses to run.
 */
const CLOSE_WINDOW_ACTION = 'closeWindow'

export function isKnownFlowAction(action: string): boolean {
  return FLOW_ACTION_CATALOG.includes(action) && action === CLOSE_WINDOW_ACTION
}

export interface ExecutionResult {
  ok: boolean
  reason?: string
}

/**
 * Keystroke execution (shortcut/macro controls) — re-enabled after a
 * redesign, following two real incidents with the previous mechanism.
 *
 * What happened: the old windowFocus.ts used an `AttachThreadInput`
 * dance run inside a *freshly-spawned PowerShell child process* to work
 * around Windows' foreground-lock restriction. Chrome was left unable to
 * reopen after a configured Ctrl+W, then crashed outright on a plain
 * Ctrl+R — two different actions, one shared mechanism.
 *
 * What changed: windowFocus.ts no longer spawns anything or uses
 * AttachThreadInput at all. It calls `SetForegroundWindow` directly from
 * Flow's own main process via `koffi` (an FFI library with prebuilt
 * binaries), synchronously, in the same tick as the click that triggered
 * it. That matters because Flow's process — not some unrelated freshly
 * spawned child — is the one that just received the user's input, which
 * is exactly the ordinary case `SetForegroundWindow` is designed to
 * allow. `AttachThreadInput` existed specifically to work around *not*
 * having that standing; removing the need for the workaround removes the
 * failure mode it was implicated in.
 *
 * This constant exists so the whole mechanism can still be switched off
 * in one place if something goes wrong again — see
 * docs/architecture.md's "Real execution" section.
 */
const KEYSTROKE_EXECUTION_ENABLED = true
const KEYSTROKE_EXECUTION_DISABLED_REASON =
  'Keystroke execution is temporarily disabled — see docs/architecture.md'

/** Surfaced in Developer Mode so the current state is never a silent surprise. */
export function isKeystrokeExecutionEnabled(): boolean {
  return KEYSTROKE_EXECUTION_ENABLED
}

/**
 * Shortcuts that can close a window or quit an application entirely.
 *
 * Kept even after the windowFocus.ts redesign above: closing a window is
 * a fundamentally different risk than pressing Ctrl+S or Ctrl+F5 — it can
 * end a whole application's session — and it already has a dedicated,
 * genuinely safer path (`flowAction: 'closeWindow'` / windowClose.ts, no
 * keystroke at all). Per brainstorm.md section 16's caution about
 * automating potentially dangerous actions, these never execute as a
 * keystroke — refused with a clear reason, same as an unrecognized key
 * name. Order-independent (checked as a set).
 */
const BLOCKED_COMBOS: string[][] = [
  ['Alt', 'F4'],
  ['Control', 'W'],
  ['Control', 'Shift', 'W'],
  ['Control', 'Q'],
  ['Control', 'F4']
]

function comboSetKey(keys: string[]): string {
  return [...keys].map((key) => key.toLowerCase()).sort().join('+')
}

const BLOCKED_COMBO_KEYS = new Set(BLOCKED_COMBOS.map(comboSetKey))

/** Pure and exported separately so it's directly unit-testable. */
export function isBlockedShortcut(comboKeys: string[]): boolean {
  return BLOCKED_COMBO_KEYS.has(comboSetKey(comboKeys))
}

/**
 * Resolves a stored combo (e.g. ['Control', 'Shift', 'P']) into the
 * modifier codes + trigger code uiohook-napi's keyTap needs, or null if
 * any name in it isn't in our vocabulary. Pure and exported separately so
 * it's unit-testable without touching the native hook.
 *
 * The last key in the array is always the trigger (matches how
 * captureService.ts builds combos: [...modifiers, triggerKey]); everything
 * before it is a modifier.
 */
export function resolveShortcutParts(
  comboKeys: string[]
): { modifierCodes: number[]; triggerCode: number } | null {
  if (comboKeys.length === 0) return null

  const triggerName = comboKeys[comboKeys.length - 1]
  const modifierNames = comboKeys.slice(0, -1)

  const triggerCode = keyCodeForName(triggerName)
  if (triggerCode === undefined) return null

  const modifierCodes: number[] = []
  for (const name of modifierNames) {
    const code = keyCodeForName(name)
    if (code === undefined) return null
    modifierCodes.push(code)
  }

  return { modifierCodes, triggerCode }
}

function sendShortcut(comboKeys: string[]): ExecutionResult {
  // A brand-new, not-yet-configured control (see profileCreation.ts)
  // starts with an empty combo — a deliberate safe no-op, not a malformed
  // one, so it deserves its own clear reason rather than falling through
  // to resolveShortcutParts' generic "unrecognized key" message.
  if (comboKeys.length === 0) {
    return { ok: false, reason: 'This control has no shortcut set yet' }
  }

  // Enforced here too (not just in executeControlAction) so a macro step
  // that happens to be a window-closing combo is refused the same way a
  // direct shortcut control would be — one true enforcement point.
  if (isBlockedShortcut(comboKeys)) {
    return {
      ok: false,
      reason: `Refused: ${comboKeys.join('+')} can close a window or quit an application — window-closing shortcuts are never auto-executed`
    }
  }

  const parts = resolveShortcutParts(comboKeys)
  if (!parts) {
    return { ok: false, reason: `Unrecognized key in combo: ${comboKeys.join('+')}` }
  }
  // Mark this combo as our own synthetic input *before* sending it — see
  // selfInjectedKeys.ts. Otherwise captureService.ts's global hook (if
  // workflow monitoring is on) would pick up this exact keydown and log it
  // as a real user-typed shortcut.
  markSelfInjected(comboKeys)
  uIOhook.keyTap(parts.triggerCode, parts.modifierCodes)
  return { ok: true }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Best-effort refocuses `targetHwnd` (if given) before sending, and
 * refuses to send at all if that focus can't be confirmed — see
 * windowFocus.ts for why a naive focus call isn't trustworthy on its own.
 * `targetHwnd: null` means "send without refocusing" (used for the
 * currently-focused app, where no refocus is needed).
 */
function focusThenSend(comboKeys: string[], targetHwnd: number | null): ExecutionResult {
  if (targetHwnd !== null) {
    const focused = focusWindowAndVerify(targetHwnd)
    if (!focused) {
      return { ok: false, reason: 'Could not confirm focus on the target window — refused to send' }
    }
  }
  return sendShortcut(comboKeys)
}

/** How many macros deep a chain of nested `{type: 'macro'}` steps can go
 *  before execution refuses to continue — a fixed backstop against a
 *  runaway chain, on top of (not instead of) the cycle check below. */
const MAX_MACRO_NESTING_DEPTH = 3

/**
 * Runs a macro's steps in order, stopping at the first failure. Shared by
 * the `macro` control-action case above and by the Macro Studio's "Test"
 * button (testMacroSteps, via IPC) — the latter runs on steps that may not
 * be saved yet, so it calls this directly with a fresh visited-set rather
 * than going through a macro id.
 *
 * `visitedMacroIds` is how a nested `{type: 'macro'}` step is guarded
 * against referencing itself, directly or through a longer cycle (A → B →
 * A) — refused with a clear reason rather than recursing forever.
 */
export async function executeMacroSteps(
  steps: MacroStep[],
  targetHwnd: number | null,
  visitedMacroIds: Set<string> = new Set()
): Promise<ExecutionResult> {
  for (const step of steps) {
    switch (step.type) {
      case 'delay':
        await sleep(Math.max(0, step.ms))
        continue // the delay *is* the pacing for this step — no extra sleep after it

      case 'shortcut': {
        const result = sendShortcut(step.keys)
        if (!result.ok) return result
        break
      }

      case 'systemCommand':
        if (!isKnownSystemCommand(step.command)) {
          return { ok: false, reason: `Unknown system command: ${step.command}` }
        }
        if (!executeSystemCommand(step.command)) {
          return { ok: false, reason: `System command failed: ${step.command}` }
        }
        break

      case 'flowAction':
        if (!isKnownFlowAction(step.action)) {
          return { ok: false, reason: `flowAction "${step.action}" is not implemented yet` }
        }
        if (targetHwnd === null) {
          return { ok: false, reason: 'No known target window to close' }
        }
        if (!closeWindowGracefully(targetHwnd)) {
          return { ok: false, reason: 'Could not deliver the close message to the target window' }
        }
        break

      case 'launchApplication':
        return { ok: false, reason: 'launchApplication execution is not implemented yet' }

      case 'macro': {
        if (visitedMacroIds.has(step.macroId)) {
          return { ok: false, reason: 'Refused: macro references itself, directly or indirectly' }
        }
        if (visitedMacroIds.size >= MAX_MACRO_NESTING_DEPTH) {
          return { ok: false, reason: `Refused: macros can nest at most ${MAX_MACRO_NESTING_DEPTH} levels deep` }
        }
        const nested = getMacroById(step.macroId)
        if (!nested) return { ok: false, reason: 'Macro not found' }
        if (!nested.enabled) return { ok: false, reason: 'Macro is disabled' }

        const result = await executeMacroSteps(
          nested.actions,
          targetHwnd,
          new Set([...visitedMacroIds, step.macroId])
        )
        if (!result.ok) return result
        break
      }
    }

    // Real input pacing between steps — skipped for 'delay' (already
    // waited above) and 'flowAction' (WM_CLOSE isn't synthetic input, so
    // there's nothing to give the OS time to process).
    if (step.type !== 'flowAction') {
      await sleep(80)
    }
  }
  return { ok: true }
}

/**
 * Executes whatever a control's configured action says to do, against a
 * specific target window (or null for "whatever's already focused").
 *
 * Only ever sends combos already validated against the closed key-name
 * vocabulary (never arbitrary typed content — same "no content" property
 * that governs capture also governs execution), never a window-closing
 * combo as a keystroke (see BLOCKED_COMBOS above — closing has its own
 * safe path via `flowAction: 'closeWindow'` instead), and only ever runs
 * system commands from the fixed allowlist. `launchApplication` and any
 * other `flowAction` are not implemented yet — see docs/architecture.md.
 */
export async function executeControlAction(
  action: ControlAction,
  targetHwnd: number | null
): Promise<ExecutionResult> {
  switch (action.type) {
    case 'shortcut': {
      if (!KEYSTROKE_EXECUTION_ENABLED) {
        return { ok: false, reason: KEYSTROKE_EXECUTION_DISABLED_REASON }
      }
      // Checked before the focus dance too, not just inside sendShortcut —
      // no reason to steal focus for a combo that's about to be refused.
      if (isBlockedShortcut(action.keys)) {
        return sendShortcut(action.keys) // returns the same refusal, no focus attempt
      }
      return focusThenSend(action.keys, targetHwnd)
    }

    case 'macro': {
      if (!KEYSTROKE_EXECUTION_ENABLED) {
        return { ok: false, reason: KEYSTROKE_EXECUTION_DISABLED_REASON }
      }

      const macro = getMacroById(action.macroId)
      if (!macro) return { ok: false, reason: 'Macro not found' }
      if (!macro.enabled) return { ok: false, reason: 'Macro is disabled' }

      if (targetHwnd !== null && !focusWindowAndVerify(targetHwnd)) {
        return { ok: false, reason: 'Could not confirm focus on the target window — refused to send' }
      }

      return executeMacroSteps(macro.actions, targetHwnd, new Set([action.macroId]))
    }

    case 'systemCommand':
      if (!isKnownSystemCommand(action.command)) {
        return { ok: false, reason: `Unknown system command: ${action.command}` }
      }
      return { ok: executeSystemCommand(action.command) }

    case 'flowAction':
      if (isKnownFlowAction(action.action)) {
        if (targetHwnd === null) {
          return { ok: false, reason: 'No known target window to close' }
        }
        const posted = closeWindowGracefully(targetHwnd)
        return posted
          ? { ok: true }
          : { ok: false, reason: 'Could not deliver the close message to the target window' }
      }
      return { ok: false, reason: `flowAction "${action.action}" is not implemented yet` }

    case 'launchApplication':
      return { ok: false, reason: `${action.type} execution is not implemented yet` }
  }
}
