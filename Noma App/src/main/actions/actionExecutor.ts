import { uIOhook } from 'uiohook-napi'
import { FLOW_ACTION_CATALOG } from '@shared/constants'
import type { ActionRunState, ControlAction, MacroStep } from '@shared/types'
import { keyCodeForName } from '../workflow/keyNames'
import { markSelfInjected } from '../workflow/selfInjectedKeys'
import { getMacroById } from '../database/repositories/macrosRepository'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import { focusWindowAndVerify } from './windowFocus'
import { closeWindowGracefully } from './windowClose'
import { executeSystemCommand, isKnownSystemCommand } from './systemCommands'
import { findMainWindowHandleForProcess } from './processWindow'
import { executeClick } from './click'
import { uiaControlFinder } from './uiaControlFinder'
import { sleep } from '../util'

/**
 * The only implemented flowAction so far. Deliberately the *safe*
 * replacement for sending Alt+F4/Ctrl+Q as a keystroke (see
 * BLOCKED_COMBOS below and windowClose.ts): posts WM_CLOSE: the same
 * message a title bar's X button sends; rather than simulating a
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

/** A saved workflow the user has paused (Workflows page). */
export const MACRO_PAUSED_REASON = 'This workflow is paused. Resume it on the Workflows page to use it'

export interface ExecutionResult {
  ok: boolean
  reason?: string
}

/**
 * Keystroke execution (shortcut/macro controls); re-enabled after a
 * redesign, following two real incidents with the previous mechanism.
 *
 * What happened: the old windowFocus.ts used an `AttachThreadInput`
 * dance run inside a *freshly-spawned PowerShell child process* to work
 * around Windows' foreground-lock restriction. Chrome was left unable to
 * reopen after a configured Ctrl+W, then crashed outright on a plain
 * Ctrl+R; two different actions, one shared mechanism.
 *
 * What changed: windowFocus.ts no longer spawns anything or uses
 * AttachThreadInput at all. It calls `SetForegroundWindow` directly from
 * Flow's own main process via `koffi` (an FFI library with prebuilt
 * binaries), synchronously, in the same tick as the click that triggered
 * it. That matters because Flow's process; not some unrelated freshly
 * spawned child; is the one that received the user's input, which
 * is exactly the ordinary case `SetForegroundWindow` is designed to
 * allow. `AttachThreadInput` existed specifically to work around *not*
 * having that standing; removing the need for the workaround removes the
 * failure mode it was implicated in.
 *
 * This constant exists so the whole mechanism can still be switched off
 * in one place if something goes wrong again: see
 * docs/architecture.md's "Real execution" section.
 */
const KEYSTROKE_EXECUTION_ENABLED = true
const KEYSTROKE_EXECUTION_DISABLED_REASON =
  'Keystroke execution is temporarily disabled. See docs/architecture.md'

/** Surfaced in Developer Mode so the current state is never a silent surprise. */
export function isKeystrokeExecutionEnabled(): boolean {
  return KEYSTROKE_EXECUTION_ENABLED
}

/**
 * Shortcuts that can close a window or quit an application entirely.
 *
 * Kept even after the windowFocus.ts redesign above: closing a window is
 * a fundamentally different risk than pressing Ctrl+S or Ctrl+F5; it can
 * end a whole application's session; and it already has a dedicated,
 * genuinely safer path (`flowAction: 'closeWindow'` / windowClose.ts, no
 * keystroke at all). Per brainstorm.md section 16's caution about
 * automating potentially dangerous actions, these never execute as a
 * keystroke; refused with a clear reason, same as an unrecognized key
 * name. Order-independent (checked as a set).
 *
 * `Control+W` was deliberately removed from this list by explicit user
 * request (2026-09-07), to let a control map directly to it (e.g. closing
 * a browser tab); even after being told the specific incident this list
 * exists to prevent: sending `Ctrl+W` to Chrome's last tab once left
 * Chrome running as an unresponsive background process, needing every
 * `chrome.exe` killed by hand before it would open again (see
 * docs/security-review.md and docs/architecture.md's "Real execution"
 * section for the full history). That failure mode is real and this
 * change reintroduces it; if it recurs, that's this change, not a new
 * bug, and the fix is to re-add `['Control', 'W']` here rather than
 * re-investigate from scratch. `flowAction: 'closeWindow'` below remains
 * the safer choice for "close a window" in any new configuration.
 */
const BLOCKED_COMBOS: string[][] = [
  ['Alt', 'F4'],
  ['Control', 'Shift', 'W'],
  ['Control', 'Q'],
  ['Control', 'F4'],
  // macOS: Cmd+Q quits the app, Cmd+Option+W closes all its windows, and
  // Cmd+Shift+W closes the whole window in most apps. Cmd+W (close a tab)
  // stays allowed, matching Ctrl+W above.
  ['Meta', 'Q'],
  ['Meta', 'Alt', 'W'],
  ['Meta', 'Shift', 'W']
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
  // starts with an empty combo: a deliberate safe no-op, not a malformed
  // one, so it deserves its own clear reason rather than falling through
  // to resolveShortcutParts' generic "unrecognized key" message.
  if (comboKeys.length === 0) {
    return { ok: false, reason: 'This control has no shortcut set yet' }
  }

  // Enforced here too (not in executeControlAction) so a macro step
  // that happens to be a window-closing combo is refused the same way a
  // direct shortcut control would be; one true enforcement point.
  if (isBlockedShortcut(comboKeys)) {
    return {
      ok: false,
      reason: `Refused: ${comboKeys.join('+')} can close a window or quit an application. Window-closing shortcuts are never auto-executed`
    }
  }

  const parts = resolveShortcutParts(comboKeys)
  if (!parts) {
    return { ok: false, reason: `Unrecognized key in combo: ${comboKeys.join('+')}` }
  }
  // Mark this combo as our own synthetic input *before* sending it: see
  // selfInjectedKeys.ts. Otherwise captureService.ts's global hook (if
  // workflow monitoring is on) would pick up this exact keydown and log it
  // as a real user-typed shortcut.
  markSelfInjected(comboKeys)
  uIOhook.keyTap(parts.triggerCode, parts.modifierCodes)
  return { ok: true }
}

/** Set by cancelRunningAction; checked between steps and during waits. */
let cancelRequested = false

/** Shown when the user stopped a running action. */
export const ACTION_CANCELLED_REASON = 'You stopped it'

/** Waits like sleep, but returns early (false) once a stop is requested. */
async function waitUnlessCancelled(ms: number): Promise<boolean> {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (cancelRequested) return false
    await sleep(Math.min(50, until - Date.now()))
  }
  return !cancelRequested
}

/**
 * Switches to an already-running application by id: the `focusApplication`
 * ControlAction/MacroStep (see its doc comment in shared/types). Resolves
 * the id to a process name (applicationsRepository), finds that process's
 * main window (processWindow.ts), and focuses it via the exact same
 * SetForegroundWindow + verify path every other real focus already uses.
 * Fails closed at every step; unknown application, not currently running,
 * or focus not confirmed; never guesses and never launches anything.
 */
async function focusApplicationById(applicationId: string): Promise<ExecutionResult> {
  const application = getApplicationById(applicationId)
  if (!application) {
    return { ok: false, reason: 'Unknown application, nothing to focus' }
  }

  const hwnd = await findMainWindowHandleForProcess(application.processName)
  if (hwnd === null) {
    return {
      ok: false,
      reason: `${application.name} isn't currently running. Noma focuses existing windows; it doesn't launch applications`
    }
  }

  return (await focusWindowAndVerify(hwnd))
    ? { ok: true }
    : { ok: false, reason: `Could not confirm focus on ${application.name}` }
}

/**
 * Best-effort refocuses `targetHwnd` (if given) before sending, and
 * refuses to send at all if that focus can't be confirmed: see
 * windowFocus.ts for why a naive focus call isn't trustworthy on its own.
 * `targetHwnd: null` means "send without refocusing" (used for the
 * currently-focused app, where no refocus is needed).
 */
async function focusThenSend(comboKeys: string[], targetHwnd: number | null): Promise<ExecutionResult> {
  if (targetHwnd !== null) {
    const focused = await focusWindowAndVerify(targetHwnd)
    if (!focused) {
      return { ok: false, reason: 'Could not confirm focus on the target window, refused to send' }
    }
  }
  return sendShortcut(comboKeys)
}

/** How many macros deep a chain of nested `{type: 'macro'}` steps can go
 *  before execution refuses to continue: a fixed backstop against a
 *  runaway chain, on top of (not instead of) the cycle check below. */
const MAX_MACRO_NESTING_DEPTH = 3

/**
 * Runs a macro's steps in order, stopping at the first failure. Shared by
 * the `macro` control-action case above and by the Macro Studio's "Test"
 * button (testMacroSteps, via IPC): the latter runs on steps that may not
 * be saved yet, so it calls this directly with a fresh visited-set rather
 * than going through a macro id.
 *
 * `visitedMacroIds` is how a nested `{type: 'macro'}` step is guarded
 * against referencing itself, directly or through a longer cycle (A → B →
 * A); refused with a clear reason rather than recursing forever.
 */
export async function executeMacroSteps(
  steps: MacroStep[],
  targetHwnd: number | null,
  visitedMacroIds: Set<string> = new Set()
): Promise<ExecutionResult> {
  const actions = steps.filter((step) => step.type !== 'delay').length
  let actionIndex = 0
  if (steps.some((step) => step.type === 'click' && step.target.startsWith('label:'))) uiaControlFinder.warmUp()
  for (const step of steps) {
    if (step.type !== 'delay') actionIndex++
    // Checked before every step, so a stop lands between steps: never
    // halfway through a shortcut or a click, and nothing already done is
    // undone. The message says exactly where it stopped.
    const result = cancelRequested
      ? { ok: false, reason: ACTION_CANCELLED_REASON }
      : await executeMacroStep(step, targetHwnd, visitedMacroIds)
    if (!result.ok) {
      // Say where it stopped, so a half-run workflow is never a mystery:
      // "Stopped at step 3 of 5: ..." tells the user exactly what did and
      // didn't happen before they carry on by hand.
      return actions > 1 && !result.reason?.startsWith('Stopped at step')
        ? { ok: false, reason: `Stopped at step ${actionIndex} of ${actions}: ${result.reason ?? 'failed'}` }
        : result
    }

    // Real input pacing between steps; skipped for 'delay' (already
    // waited) and 'flowAction' (WM_CLOSE isn't synthetic input, so there's
    // nothing to give the OS time to process). A freshly-focused window gets
    // longer: raising a window can involve an animation, and the next step
    // is very often a paste that needs to land inside it. A named-control
    // click needs no fixed pause for the *next* step: if that step is also
    // a named click, its own search waits for its control to appear.
    if (step.type === 'focusApplication') {
      await sleep(200)
    } else if (step.type !== 'flowAction' && step.type !== 'delay') {
      await sleep(80)
    }
  }
  return { ok: true }
}

async function executeMacroStep(
  step: MacroStep,
  targetHwnd: number | null,
  visitedMacroIds: Set<string>
): Promise<ExecutionResult> {
  switch (step.type) {
    case 'none':
      return { ok: true }

    case 'delay':
      return (await waitUnlessCancelled(Math.max(0, step.ms)))
        ? { ok: true }
        : { ok: false, reason: ACTION_CANCELLED_REASON }

    case 'shortcut':
      return sendShortcut(step.keys)

    case 'systemCommand':
      if (!isKnownSystemCommand(step.command)) {
        return { ok: false, reason: `Unknown system command: ${step.command}` }
      }
      if (!executeSystemCommand(step.command)) {
        return { ok: false, reason: `System command failed: ${step.command}` }
      }
      return { ok: true }

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
      return { ok: true }

    case 'launchApplication':
      return { ok: false, reason: 'launchApplication execution is not implemented yet' }

    case 'focusApplication':
      return focusApplicationById(step.applicationId)

    case 'click':
      return executeClick(step.target, step.applicationId)

    case 'macro': {
      if (visitedMacroIds.has(step.macroId)) {
        return { ok: false, reason: 'Refused: macro references itself, directly or indirectly' }
      }
      if (visitedMacroIds.size >= MAX_MACRO_NESTING_DEPTH) {
        return { ok: false, reason: `Refused: macros can nest at most ${MAX_MACRO_NESTING_DEPTH} levels deep` }
      }
      const nested = getMacroById(step.macroId)
      if (!nested) return { ok: false, reason: 'Macro not found' }
      if (!nested.enabled) return { ok: false, reason: MACRO_PAUSED_REASON }

      return executeMacroSteps(nested.actions, targetHwnd, new Set([...visitedMacroIds, step.macroId]))
    }
  }
}

let actionInProgress = false

/** Shown (and logged) when a press arrives while another is still running. */
export const ACTION_BUSY_REASON = 'Still finishing the previous action, so this press was ignored. Press again once it is done'

/**
 * Runs a control's action, one at a time. A press that arrives while another
 * action is still running is refused, not queued and not run alongside it.
 *
 * A learned workflow replays at the pace it was recorded, so it can take a
 * few seconds, and pressing again because nothing seemed to happen yet is
 * natural. Two runs at once drive the same mouse and keyboard and undo each
 * other: on a real test, a second press 1.85 s into a Notepad "Edit -> Select
 * all -> Copy" replay clicked Edit again, closing the menu the first run had
 * opened, and both runs failed at "Select all". Refusing is safer than
 * queueing: an action that fires seconds after the press, after the user has
 * moved on, is worse than one that didn't fire.
 */
export function executeControlActionExclusively(
  action: ControlAction,
  targetHwnd: number | null,
  label?: string
): Promise<ExecutionResult> {
  return runActionExclusively(() => executeControlAction(action, targetHwnd), label)
}

let runState: ActionRunState = { running: false }
const runStateListeners = new Set<(state: ActionRunState) => void>()

function setRunState(state: ActionRunState): void {
  runState = state
  for (const listener of runStateListeners) listener(state)
}

/** What's running now (for the app's Stop button and the tray). */
export function getActionRunState(): ActionRunState {
  return runState
}

/** Called whenever an action starts or ends. Returns an unsubscribe. */
export function onActionRunState(listener: (state: ActionRunState) => void): () => void {
  runStateListeners.add(listener)
  return () => runStateListeners.delete(listener)
}

export function isActionRunning(): boolean {
  return actionInProgress
}

/**
 * Asks the running action to stop before its next step. Steps already done
 * stay done (there's no undo for a keystroke someone else's app received).
 * False when nothing is running.
 */
export function cancelRunningAction(): boolean {
  if (!actionInProgress) return false
  cancelRequested = true
  return true
}

/** The lock itself, shared by every way an action can be started (a press,
 *  and the editors' Test buttons). */
export async function runActionExclusively(
  run: () => Promise<ExecutionResult>,
  label?: string
): Promise<ExecutionResult> {
  if (actionInProgress) return { ok: false, reason: ACTION_BUSY_REASON }
  actionInProgress = true
  cancelRequested = false
  setRunState({ running: true, label, startedAt: Date.now() })
  try {
    return await run()
  } finally {
    actionInProgress = false
    cancelRequested = false
    setRunState({ running: false })
  }
}

/**
 * Executes whatever a control's configured action says to do, against a
 * specific target window (or null for "whatever's already focused").
 *
 * Only ever sends combos already validated against the closed key-name
 * vocabulary (never arbitrary typed content; same "no content" property
 * that governs capture also governs execution), never a window-closing
 * combo as a keystroke (see BLOCKED_COMBOS above; closing has its own
 * safe path via `flowAction: 'closeWindow'` instead), and only ever runs
 * system commands from the fixed allowlist. `launchApplication` and any
 * other `flowAction` are not implemented yet: see docs/architecture.md.
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
      // Checked before the focus dance too, not inside sendShortcut
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
      if (!macro.enabled) return { ok: false, reason: MACRO_PAUSED_REASON }

      if (targetHwnd !== null && !(await focusWindowAndVerify(targetHwnd))) {
        return { ok: false, reason: 'Could not confirm focus on the target window, refused to send' }
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

    case 'none':
      return { ok: false, reason: 'Nothing is assigned to this zone' }

    case 'launchApplication':
      return { ok: false, reason: `${action.type} execution is not implemented yet` }

    case 'focusApplication':
      return focusApplicationById(action.applicationId)

    // Only ever reached via a nested `macro` action's own steps in
    // practice: see the `click` ControlAction's doc comment in
    // shared/types for why the Control Mapping Editor never offers it
    // directly. Handled here too so `executeControlAction` stays
    // exhaustive rather than silently unreachable for a valid variant.
    case 'click':
      return executeClick(action.target, action.applicationId)
  }
}
