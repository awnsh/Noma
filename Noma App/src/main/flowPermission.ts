import type { FlowPermissionState } from '@shared/types'
import { isAccessibilityTrusted } from './actions/macos'
import { isMac } from './platform'
import { isInputHookRunning, isInputHookWanted } from './workflow/sharedHook'

/** System Settings → Privacy & Security → Accessibility. */
export const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

/**
 * Whether Flow can actually work on this Mac right now. Asked fresh every
 * time (AXIsProcessTrusted is cheap and needs no prompt), because the
 * answer changes while Noma runs: the user grants access in System
 * Settings, or an unsigned update leaves Noma's old entry switched on there
 * but no longer matching the app, which macOS treats as not allowed.
 */
export function flowPermissionState(): FlowPermissionState {
  return {
    needed: isMac,
    accessibility: isMac ? isAccessibilityTrusted() : true,
    listening: isInputHookRunning(),
    listenerWanted: isInputHookWanted()
  }
}
