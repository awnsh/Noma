import { GetForegroundWindow, IsWindow, SetForegroundWindow } from './win32'
import { execFile } from 'child_process'
import { isAppFrontmost, requestActivation } from './macos'
import { isMac } from '../platform'
import { sleep } from '../util'
import {
  MAC_ACTIVATION_POLL_MS,
  MAC_ACTIVATION_WAIT_MS,
  MAC_WORKSPACE_ACTIVATE_TIMEOUT_MS,
  MAC_WORKSPACE_EXTRA_WAIT_MS
} from './timings'

/**
 * Focuses the target window and confirms the switch actually landed
 * before returning true. Fails closed: if it can't confirm, the caller
 * must not send a synthetic keystroke: a misdirected one is worse than a
 * missed one (unchanged from the original design).
 *
 * REDESIGNED after two real incidents (see docs/architecture.md's "Real
 * execution" section for the full account) with the old
 * AttachThreadInput-based approach, which ran inside a freshly-spawned
 * PowerShell child process. That child process had never itself received
 * any user input, which is exactly the condition Windows' foreground-lock
 * is designed to block. AttachThreadInput was a workaround for fighting
 * that restriction, and workarounds for OS security restrictions are
 * exactly the kind of thing worth being suspicious of after two crashes.
 *
 * This version calls SetForegroundWindow directly from Flow's own main
 * process; no spawned process, no AttachThreadInput, no workaround
 * needed at all. That's because the call happens synchronously inside the
 * same event-loop tick as the click that triggered it: Flow's process is
 * *itself* the current foreground process at that moment (it * received the click), and Windows explicitly permits the foreground
 * process to hand foreground status to another window: this is the
 * ordinary, sanctioned case the API exists for, not an edge case being
 * routed around.
 */
export async function focusWindowAndVerify(targetHwnd: number): Promise<boolean> {
  if (isMac) return focusAppAndVerify(targetHwnd)
  if (!IsWindow(targetHwnd)) return false
  SetForegroundWindow(targetHwnd)
  return GetForegroundWindow() === targetHwnd
}

/**
 * macOS: the "handle" is the target app's pid (see macAdapter.ts). Usually
 * that app is already in front (the user pressed a key or tapped while in
 * it), so nothing changes. Otherwise it is asked to come forward, and the
 * same rule applies as on Windows: no confirmation, no keystroke.
 */
async function focusAppAndVerify(pid: number): Promise<boolean> {
  if (pid <= 0) return false
  if (isAppFrontmost(pid)) return true
  // AXFrontmost needs the app to answer the Accessibility API, which some
  // (Chromium-based) apps don't; NSRunningApplication asks the system
  // instead. Either way, nothing is sent until the app is confirmed in front.
  let waitMs = MAC_ACTIVATION_WAIT_MS
  if (!requestActivation(pid)) {
    activateWithWorkspace(pid)
    waitMs += MAC_WORKSPACE_EXTRA_WAIT_MS
  }
  const deadline = Date.now() + waitMs
  while (Date.now() < deadline) {
    await sleep(MAC_ACTIVATION_POLL_MS)
    if (isAppFrontmost(pid)) return true
  }
  return false
}

function activateWithWorkspace(pid: number): void {
  const script = `ObjC.import('AppKit'); function run(argv) { const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(argv[0])); if (!app.isNil()) app.activateWithOptions(3); }`
  execFile('osascript', ['-l', 'JavaScript', '-e', script, String(pid)], { timeout: MAC_WORKSPACE_ACTIVATE_TIMEOUT_MS }, () => {})
}
