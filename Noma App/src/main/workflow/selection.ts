/**
 * Whether the user has something highlighted right now, as far as Flow can
 * tell, so a bare Delete or Backspace can be recognized as "delete what's
 * highlighted" (a command) rather than typing.
 *
 * The capture policy (captureFilter.ts) never records a key pressed on its
 * own, because that is where typing lives. The one exception, chosen by the
 * user on 2026-10-13: Delete or Backspace pressed straight after a highlight
 * (a drag, a double-click, Shift+arrows, Select all, picking a file or clip),
 * in the same app, before any other key, within HIGHLIGHT_ACT_WINDOW_MS. That
 * press deletes the selection; it can't be part of typing a word, since any
 * other key in between disarms it. Only the first such press counts.
 *
 * Holds one flag, an app id and a time. Nothing about what was highlighted.
 */

/** How long after a highlight a Delete still counts as deleting it. */
export const HIGHLIGHT_ACT_WINDOW_MS = 10_000

let armed: { applicationId: string | null; at: number } | null = null

/** A highlight just happened in `applicationId`. */
export function noteHighlight(applicationId: string | null, at: number = Date.now()): void {
  armed = { applicationId, at }
}

/** Any other key was pressed: whatever comes next is typing, not deleting
 *  the highlight. */
export function noteOtherKey(): void {
  armed = null
}

/** Whether a Delete/Backspace now, in `applicationId`, deletes a highlight.
 *  Consumes it: a second Backspace is editing, not another deletion. */
export function takeHighlight(applicationId: string | null, now: number = Date.now()): boolean {
  const current = armed
  armed = null
  return !!current && current.applicationId === applicationId && now - current.at <= HIGHLIGHT_ACT_WINDOW_MS
}

/** Test-only. */
export function __resetSelectionForTesting(): void {
  armed = null
}
