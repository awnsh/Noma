import { uIOhook, type UiohookKeyboardEvent } from 'uiohook-napi'
import { shouldCaptureKeyCombo } from './captureFilter'
import { MODIFIER_KEYCODES, keyNameForCode, type CommandModifierName } from './keyNames'
import type { CapturedKeyEvent } from './types'

/**
 * Builds the modifier-gated key combo for a single keydown event, or null
 * if this event shouldn't be captured at all (see docs/privacy-and-legal.md
 * and captureFilter.ts for the policy this enforces).
 *
 * This only ever fires on the "trigger" key of a chord — the non-modifier
 * key pressed while one or more of Control/Alt/Meta is already held —
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

/**
 * Owns the actual global keyboard hook (uiohook-napi, N-API — no C++
 * toolchain needed, see the note in windowsAdapter.ts for why that
 * matters on this machine). The hook is only ever engaged while `start()`
 * has been called — i.e. only while the user has explicitly enabled
 * workflow monitoring. When disabled (the default), no OS-level hook is
 * installed at all, not merely "installed but ignored" — see
 * docs/privacy-and-legal.md.
 */
export class CaptureService {
  private isRunning = false
  private currentApplicationId: string | null = null
  private readonly onCombo: (event: CapturedKeyEvent) => void

  constructor(onCombo: (event: CapturedKeyEvent) => void) {
    this.onCombo = onCombo
  }

  setCurrentApplicationId(applicationId: string | null): void {
    this.currentApplicationId = applicationId
  }

  start(): void {
    if (this.isRunning) return
    uIOhook.on('keydown', this.handleKeydown)
    uIOhook.start()
    this.isRunning = true
  }

  stop(): void {
    if (!this.isRunning) return
    uIOhook.stop()
    uIOhook.off('keydown', this.handleKeydown)
    this.isRunning = false
  }

  get running(): boolean {
    return this.isRunning
  }

  private readonly handleKeydown = (event: UiohookKeyboardEvent): void => {
    const combo = comboFromKeydownEvent(event)
    if (!combo) return
    this.onCombo({
      applicationId: this.currentApplicationId,
      comboKeys: combo,
      timestamp: Date.now()
    })
  }
}
