import { uIOhook, type UiohookKeyboardEvent } from 'uiohook-napi'
import { acquireHook, releaseHook } from './sharedHook'
import { shouldCaptureKeyCombo } from './captureFilter'
import { MODIFIER_KEYCODES, keyNameForCode, type CommandModifierName } from './keyNames'
import type { CapturedKeyEvent } from './types'
import { isSelfInjected } from './selfInjectedKeys'
import { noteHighlight, noteOtherKey, takeHighlight } from './selection'
import { shortcutRole } from './workflowSense'
import { isMac } from '../platform'

/**
 * Builds the modifier-gated key combo for a single keydown event, or null
 * if this event shouldn't be captured at all (see docs/privacy-and-legal.md
 * and captureFilter.ts for the policy this enforces).
 *
 * This only ever fires on the "trigger" key of a chord: the non-modifier
 * key pressed while one or more of Control/Alt/Meta is already held
 * never on a bare modifier keydown by itself. That means a lone Ctrl press
 * never reaches shouldCaptureKeyCombo, and a chord like Ctrl+Shift+P is
 * reported exactly once (when P completes it), not once per modifier.
 *
 * Exported separately from CaptureService (which owns the actual global
 * hook) specifically so this logic is unit-testable without touching the
 * native uiohook-napi hook at all.
 */
export function comboFromKeydownEvent(event: UiohookKeyboardEvent): string[] | null {
  if (MODIFIER_KEYCODES[event.keycode]) {
    return null
  }

  const pressedKeyName = keyNameForCode(event.keycode)
  if (!pressedKeyName) {
    return null
  }

  const modifiers: CommandModifierName[] = []
  if (event.ctrlKey) modifiers.push('Control')
  if (event.altKey) modifiers.push('Alt')
  if (event.metaKey) modifiers.push('Meta')
  if (event.shiftKey) modifiers.push('Shift')

  const combo = [...modifiers, pressedKeyName]
  return shouldCaptureKeyCombo(combo) ? combo : null
}

/** Keys that move the caret; with Shift held they extend a highlight. */
const SELECTION_NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

/** Bare keys that delete a highlight (see selection.ts). */
const DELETE_KEYS = new Set(['Delete', 'Backspace'])

export type KeydownKind =
  | { kind: 'modifier' }
  /** A command combo the capture policy allows (comboFromKeydownEvent). */
  | { kind: 'combo'; combo: string[] }
  /** Shift+arrow (or Home/End/Page keys), with Ctrl, or on a Mac Option or
   *  Command: extending a highlight from the keyboard. */
  | { kind: 'keyboardHighlight' }
  /** Delete or Backspace with no modifier. Recorded only right after a
   *  highlight (selection.ts); otherwise it's editing text. */
  | { kind: 'deleteKey'; key: string }
  /** Anything else: typing. Never recorded. */
  | { kind: 'other' }

/**
 * What one keydown is, for the capture rules. Only the KIND leaves this
 * function for a typed key; its name is used here and dropped.
 */
export function classifyKeydown(event: UiohookKeyboardEvent, mac: boolean = isMac): KeydownKind {
  if (MODIFIER_KEYCODES[event.keycode]) return { kind: 'modifier' }
  const key = keyNameForCode(event.keycode)
  if (!key) return { kind: 'other' }

  if (event.shiftKey && SELECTION_NAV_KEYS.has(key)) {
    // Alt+Shift+Arrow is "copy line" in editors on Windows, and Ctrl+Shift+
    // Arrow on a Mac switches spaces: commands, not selecting.
    const extraModifierOk = mac ? !event.ctrlKey : !event.altKey && !event.metaKey
    if (extraModifierOk) return { kind: 'keyboardHighlight' }
  }
  if (DELETE_KEYS.has(key) && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    return { kind: 'deleteKey', key }
  }
  const combo = comboFromKeydownEvent(event)
  return combo ? { kind: 'combo', combo } : { kind: 'other' }
}

/** Shift+arrow presses this close together are one highlight being made. */
const KEYBOARD_HIGHLIGHT_RUN_MS = 1500

export interface CapturedHighlightEvent {
  applicationId: string | null
  timestamp: number
}

/**
 * Owns the actual global keyboard hook (uiohook-napi, N-API; no C++
 * toolchain needed, see the note in windowsAdapter.ts for why that
 * matters on this machine). The hook is only ever engaged while `start()`
 * has been called; i.e. only while the user has explicitly enabled
 * workflow monitoring. When disabled (the default), no OS-level hook is
 * installed at all, not merely "installed but ignored": see
 * docs/privacy-and-legal.md.
 */
export class CaptureService {
  private isRunning = false
  private currentApplicationId: string | null = null
  private readonly onCombo: (event: CapturedKeyEvent) => void
  private readonly onHighlight: (event: CapturedHighlightEvent) => void
  /** When the current run of Shift+arrow presses last extended. */
  private keyboardHighlightAt: number | null = null

  constructor(
    onCombo: (event: CapturedKeyEvent) => void,
    onHighlight: (event: CapturedHighlightEvent) => void = () => {}
  ) {
    this.onCombo = onCombo
    this.onHighlight = onHighlight
  }

  setCurrentApplicationId(applicationId: string | null): void {
    this.currentApplicationId = applicationId
  }

  start(): void {
    if (this.isRunning) return
    uIOhook.on('keydown', this.handleKeydown)
    acquireHook()
    this.isRunning = true
  }

  stop(): void {
    if (!this.isRunning) return
    releaseHook()
    uIOhook.off('keydown', this.handleKeydown)
    this.isRunning = false
  }

  get running(): boolean {
    return this.isRunning
  }

  /** Exposed for tests: the whole pipeline for one keydown. */
  handleKey(event: UiohookKeyboardEvent, now: number = Date.now()): void {
    const applicationId = this.currentApplicationId
    const key = classifyKeydown(event)
    if (key.kind === 'modifier') return

    if (key.kind === 'keyboardHighlight') {
      // One highlight per run of Shift+arrows, not one per press.
      const continuing = this.keyboardHighlightAt !== null && now - this.keyboardHighlightAt <= KEYBOARD_HIGHLIGHT_RUN_MS
      this.keyboardHighlightAt = now
      noteHighlight(applicationId, now)
      if (!continuing) this.onHighlight({ applicationId, timestamp: now })
      return
    }
    this.keyboardHighlightAt = null

    if (key.kind === 'deleteKey') {
      // Flow's own replayed Delete: not the user's, and not a deletion of
      // anything the user highlighted.
      if (isSelfInjected([key.key])) return noteOtherKey()
      if (!takeHighlight(applicationId, now)) return
      this.onCombo({ applicationId, comboKeys: [key.key], timestamp: now })
      return
    }

    if (key.kind === 'other') return noteOtherKey()

    // Flow's own controls/macros/Test buttons send real shortcuts via this
    // exact same global hook (see selfInjectedKeys.ts); never mistake that
    // echo for the user having typed it themselves.
    if (isSelfInjected(key.combo)) return
    // Select all highlights everything; any other shortcut ends the chance
    // for a following Delete to mean "delete the highlight".
    if (shortcutRole(key.combo) === 'selectAll') noteHighlight(applicationId, now)
    else noteOtherKey()
    this.onCombo({ applicationId, comboKeys: key.combo, timestamp: now })
  }

  private readonly handleKeydown = (event: UiohookKeyboardEvent): void => {
    this.handleKey(event)
  }
}
