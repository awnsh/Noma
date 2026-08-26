import { uIOhook } from 'uiohook-napi'
import type { ControlAction } from '@shared/types'
import { keyCodeForName } from '../workflow/keyNames'
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
 */
const CLOSE_WINDOW_ACTION = 'closeWindow'

export function isKnownFlowAction(action: string): boolean {
  return action === CLOSE_WINDOW_ACTION
}

export interface ExecutionResult {
  ok: boolean
  reason?: string
}

/**
 * Real keystroke execution — both direct `shortcut` controls and `macro`
 * playback — is temporarily disabled, full stop.
 *
 * Two separate real-world incidents happened back to back through this
 * exact path (windowFocus.ts's `AttachThreadInput` dance, then
 * uIOhook.keyTap): first Chrome left unable to reopen after a configured
 * Ctrl+W, then Chrome crashing outright on a plain Ctrl+R (reload) — an
 * ordinary shortcut with nothing to do with closing anything. Two
 * incidents from the same mechanism, on two different actions, is enough
 * signal to stop shipping it — and not enough signal to know which half
 * (the focus dance, the synthetic keypress, or their interaction) is
 * actually responsible, so both are disabled together rather than
 * guessing which one to keep.
 *
 * Pressing a shortcut/macro-mapped control still logs the press and
 * flashes in the UI (VirtualHardwareDevice's buttonPress event is
 * untouched) — it just never reaches uIOhook.keyTap until this is
 * redesigned and far more thoroughly verified. `systemCommand` (volume)
 * and `flowAction: 'closeWindow'` are unaffected: neither uses
 * AttachThreadInput or uIOhook at all, so neither shares this failure
 * mode. See docs/architecture.md's "Real execution" section.
 */
const KEYSTROKE_EXECUTION_ENABLED = false
const KEYSTROKE_EXECUTION_DISABLED_REASON =
  'Keystroke execution is temporarily disabled after real crashes during testing — see docs/architecture.md'

/**
 * Shortcuts that can close a window or quit an application entirely.
 *
 * Added after a real incident: sending Ctrl+W to Chrome's last tab closed
 * its only window right as Flow's window-focus dance
 * (windowFocus.ts's AttachThreadInput trick) was touching that same
 * window, leaving Chrome running in the background but unable to open a
 * new window — "Chrome won't open anymore" until every chrome.exe process
 * was killed by hand. Whether or not the focus dance was the exact
 * mechanism, closing a window is a fundamentally different risk than
 * pressing Ctrl+S or Ctrl+F5: it can end a whole application's session.
 * Per brainstorm.md section 16's caution about automating potentially
 * dangerous actions, these never execute — refused with a clear reason,
 * same as an unrecognized key name. Order-independent (checked as a set).
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
async function focusThenSend(comboKeys: string[], targetHwnd: number | null): Promise<ExecutionResult> {
  if (targetHwnd !== null) {
    const focused = await focusWindowAndVerify(targetHwnd)
    if (!focused) {
      return { ok: false, reason: 'Could not confirm focus on the target window — refused to send' }
    }
  }
  return sendShortcut(comboKeys)
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

      if (targetHwnd !== null) {
        const focused = await focusWindowAndVerify(targetHwnd)
        if (!focused) {
          return { ok: false, reason: 'Could not confirm focus on the target window — refused to send' }
        }
      }

      for (const step of macro.actions) {
        const result = sendShortcut(step.split('+'))
        if (!result.ok) return result
        await sleep(macro.delayMs > 0 ? macro.delayMs : 80)
      }
      return { ok: true }
    }

    case 'systemCommand':
      if (!isKnownSystemCommand(action.command)) {
        return { ok: false, reason: `Unknown system command: ${action.command}` }
      }
      return { ok: await executeSystemCommand(action.command) }

    case 'flowAction':
      if (isKnownFlowAction(action.action)) {
        if (targetHwnd === null) {
          return { ok: false, reason: 'No known target window to close' }
        }
        const posted = await closeWindowGracefully(targetHwnd)
        return posted
          ? { ok: true }
          : { ok: false, reason: 'Could not deliver the close message to the target window' }
      }
      return { ok: false, reason: `flowAction "${action.action}" is not implemented yet` }

    case 'launchApplication':
      return { ok: false, reason: `${action.type} execution is not implemented yet` }
  }
}
