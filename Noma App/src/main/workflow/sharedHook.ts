import { uIOhook } from 'uiohook-napi'
import { isAccessibilityTrusted } from '../actions/macos'
import { isMac } from '../platform'

/**
 * uiohook-napi exposes one process-wide hook. Both the workflow capture
 * service and Holo's input-activity gate need it, and either stopping it
 * outright would silently kill the other; so start/stop is reference
 * counted: the OS hook is installed by the first user and removed only when
 * the last one releases it.
 */
let holders = 0
let running = false
let retryTimer: ReturnType<typeof setInterval> | null = null

/** How often a hook macOS refused is tried again. Accessibility is usually
 *  granted while Noma is already running (the prompt opens at launch), and
 *  Glide takes the hook at launch too, so without retrying Flow would see
 *  nothing until the next restart. */
const RETRY_MS = 3000

function tryStart(): boolean {
  // Asking uiohook while macOS still says no would make it show the system
  // Accessibility prompt again on every retry (it asks with the prompt
  // option); main/index.ts already showed it once at launch.
  if (isMac && !isAccessibilityTrusted()) return false
  try {
    uIOhook.start()
    running = true
    return true
  } catch (error) {
    // macOS refuses the hook until Noma has Accessibility permission.
    // Capture then sees nothing; it must never take the rest of startup
    // down with it.
    // eslint-disable-next-line no-console
    if (!retryTimer) console.warn('[hook] could not start the global input hook:', error)
    return false
  }
}

function stopRetrying(): void {
  if (retryTimer) clearInterval(retryTimer)
  retryTimer = null
}

export function acquireHook(): void {
  if (holders++ !== 0) return
  if (tryStart()) return
  retryTimer = setInterval(() => {
    if (holders === 0 || tryStart()) stopRetrying()
  }, RETRY_MS)
}

export function releaseHook(): void {
  if (holders === 0) return
  if (--holders !== 0) return
  stopRetrying()
  if (running) uIOhook.stop()
  running = false
}

/** Whether the OS-level hook is actually installed right now (not merely
 *  wanted): false while macOS is still refusing it. */
export function isInputHookRunning(): boolean {
  return running
}

/** Whether something wants the hook (Flow learning or Glide). */
export function isInputHookWanted(): boolean {
  return holders > 0
}
