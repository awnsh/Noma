/**
 * Distinguishes a real user click from Flow's own synthetic one: the click
 * counterpart to selfInjectedKeys.ts, same reason: click.ts's executeClick()
 * calls SendInput to actually fire a mouse-down/up, and clickCaptureService.ts
 * watches the same OS-level mouse hook that synthetic click also fires
 * through. Without this, a macro's own click step would immediately get
 * captured as if the user had clicked it, manufacturing a fake repeated
 * pattern purely from Flow replaying its own workflow.
 *
 * A click has no "combo" identity to match, so each mark is an expiry
 * time: markSelfInjectedClick() is called immediately before the synthetic
 * press, and each mousedown the hook sees within the TTL consumes one mark.
 * One mark per click, not a single flag: with a single flag, two synthetic
 * clicks close together shared one mark, the first consumed it, and the
 * second was recorded as if the user had clicked it.
 */

const SUPPRESS_MS = 500

let pending: number[] = []

/** Call immediately before firing a synthetic press via SendInput. */
export function markSelfInjectedClick(): void {
  pending.push(Date.now() + SUPPRESS_MS)
}

/** Reports whether a mousedown right now is (most likely) Flow's own
 *  synthetic click, and consumes that mark so a genuine next click isn't
 *  also swallowed. */
export function isSelfInjectedClick(): boolean {
  const now = Date.now()
  pending = pending.filter((expiry) => expiry >= now)
  if (pending.length === 0) return false
  pending.shift()
  return true
}

/** Test-only: resets state between tests. */
export function __resetSelfInjectedClickGuardForTesting(): void {
  pending = []
}
