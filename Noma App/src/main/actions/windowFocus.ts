import { GetForegroundWindow, IsWindow, SetForegroundWindow } from './win32'

/**
 * Focuses the target window and confirms the switch actually landed
 * before returning true. Fails closed: if it can't confirm, the caller
 * must not send a synthetic keystroke — a misdirected one is worse than a
 * missed one (unchanged from the original design).
 *
 * REDESIGNED after two real incidents (see docs/architecture.md's "Real
 * execution" section for the full account) with the old
 * AttachThreadInput-based approach, which ran inside a freshly-spawned
 * PowerShell child process. That child process had never itself received
 * any user input, which is exactly the condition Windows' foreground-lock
 * is designed to block — AttachThreadInput was a workaround for fighting
 * that restriction, and workarounds for OS security restrictions are
 * exactly the kind of thing worth being suspicious of after two crashes.
 *
 * This version calls SetForegroundWindow directly from Flow's own main
 * process — no spawned process, no AttachThreadInput, no workaround
 * needed at all. That's because the call happens synchronously inside the
 * same event-loop tick as the click that triggered it: Flow's process is
 * *itself* the current foreground process at that moment (it just
 * received the click), and Windows explicitly permits the foreground
 * process to hand foreground status to another window — this is the
 * ordinary, sanctioned case the API exists for, not an edge case being
 * routed around.
 */
export function focusWindowAndVerify(targetHwnd: number): boolean {
  if (!IsWindow(targetHwnd)) return false
  SetForegroundWindow(targetHwnd)
  return GetForegroundWindow() === targetHwnd
}
