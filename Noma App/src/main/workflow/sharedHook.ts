import { uIOhook } from 'uiohook-napi'

/**
 * uiohook-napi exposes one process-wide hook. Both the workflow capture
 * service and Holo's input-activity gate need it, and either stopping it
 * outright would silently kill the other — so start/stop is reference
 * counted: the OS hook is installed by the first user and removed only when
 * the last one releases it.
 */
let holders = 0

export function acquireHook(): void {
  if (holders++ === 0) uIOhook.start()
}

export function releaseHook(): void {
  if (holders === 0) return
  if (--holders === 0) uIOhook.stop()
}
