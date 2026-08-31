/**
 * Distinguishes a real user keystroke from Flow's own synthetic input.
 *
 * actionExecutor.ts's sendShortcut() calls uIOhook.keyTap() to actually
 * send a configured shortcut — e.g. pressing a control mapped to Ctrl+F5
 * really sends Ctrl+F5. That synthetic keypress is picked up by the exact
 * same OS-level hook captureService.ts installs to watch for *real*
 * shortcuts: Windows' low-level keyboard hook fires for injected
 * (SendInput-based) events the same as real hardware ones, and
 * uiohook-napi's UiohookKeyboardEvent carries nothing to tell the two
 * apart. Without this, every control press (or Macro Studio/Control
 * Mapping Editor "Test") that sends a shortcut would also log a
 * `shortcut`-type workflow_event as if the user had typed it — Flow
 * watching its own hand move and mistaking it for the user's, which both
 * double-counts activity and can manufacture a fake "you keep typing this
 * shortcut" pattern purely from Flow using its own controls.
 *
 * markSelfInjected() is called right before keyTap, for the same combo
 * captureService.ts's comboFromKeydownEvent will build from the resulting
 * keydown. isSelfInjected() (called from CaptureService) consumes one
 * matching pending entry — so a genuinely repeated identical shortcut
 * typed a moment later by the user still needs its own fresh mark to be
 * suppressed, it isn't waved through by a stale one — and entries expire
 * quickly regardless, in case a keyTap's keydown never arrives for some
 * reason (a stuck entry must never permanently blind capture to that
 * combo).
 *
 * Combo identity is compared order-independently (sorted, case-folded),
 * deliberately not reusing actionExecutor.ts's private comboSetKey — this
 * module is imported by both actionExecutor.ts and captureService.ts, so
 * importing from actionExecutor.ts here would create a cycle.
 */

const PENDING_TTL_MS = 500

interface PendingEntry {
  comboKey: string
  expiresAt: number
}

let pending: PendingEntry[] = []

function comboKey(keys: string[]): string {
  return [...keys].map((key) => key.toLowerCase()).sort().join('+')
}

/** Call immediately before synthesizing `comboKeys` via uIOhook.keyTap. */
export function markSelfInjected(comboKeys: string[]): void {
  const now = Date.now()
  pending = pending.filter((entry) => entry.expiresAt > now)
  pending.push({ comboKey: comboKey(comboKeys), expiresAt: now + PENDING_TTL_MS })
}

/**
 * Reports whether `comboKeys` matches a still-live self-injected mark, and
 * consumes it (removes it) if so — call from the keydown hook before
 * treating an event as real user input.
 */
export function isSelfInjected(comboKeys: string[]): boolean {
  const now = Date.now()
  const key = comboKey(comboKeys)
  const index = pending.findIndex((entry) => entry.comboKey === key && entry.expiresAt > now)
  if (index === -1) return false
  pending.splice(index, 1)
  return true
}

/** Test-only: clears all pending entries between tests. */
export function __resetSelfInjectedGuardForTesting(): void {
  pending = []
}
