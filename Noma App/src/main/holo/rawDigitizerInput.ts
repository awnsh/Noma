import type { BrowserWindow } from 'electron'
import { isWindows } from '../platform'
import {
  HID_USAGE_DIGITIZER_TOUCH_PAD,
  HID_USAGE_PAGE_DIGITIZER,
  RAWINPUTDEVICE_SIZE,
  RegisterRawInputDevices,
  RIDEV_INPUTSINK,
  RIDEV_REMOVE,
  WM_INPUT
} from '../actions/win32'

/**
 * The one registration for raw precision-touchpad reports (Holo's
 * swipe-ins, trackpadGestureService.ts). Windows keeps one raw-input target
 * per device type per process, and Electron one WM_INPUT hook per window,
 * so anything else that ever needs these reports must subscribe here rather
 * than register again, or the two would silently steal reports from each
 * other. Registered by the first subscriber, released by the last, like
 * workflow/sharedHook.ts does for the keyboard hook.
 */

type Listener = (hRawInput: number) => void

const DIGITIZER_USAGES = [HID_USAGE_DIGITIZER_TOUCH_PAD]
const listeners = new Set<Listener>()
let target: BrowserWindow | null = null

function register(flags: number, hwnd: number): boolean {
  return RegisterRawInputDevices(
    DIGITIZER_USAGES.map((usage) => ({ usUsagePage: HID_USAGE_PAGE_DIGITIZER, usUsage: usage, dwFlags: flags, hwndTarget: hwnd })),
    DIGITIZER_USAGES.length,
    RAWINPUTDEVICE_SIZE
  )
}

/** Starts delivering WM_INPUT handles to `listener`. Returns the
 *  unsubscribe function, or null when registration failed. */
export function subscribeDigitizerInput(window: BrowserWindow, listener: Listener): (() => void) | null {
  if (!isWindows) return null
  if (!target) {
    if (!register(RIDEV_INPUTSINK, readHandle(window.getNativeWindowHandle()))) return null
    window.hookWindowMessage(WM_INPUT, (_wParam, lParam) => {
      const hRawInput = readHandle(lParam)
      for (const each of listeners) each(hRawInput)
    })
    target = window
  }
  listeners.add(listener)
  return () => {
    if (!listeners.delete(listener) || listeners.size > 0 || !target) return
    const window = target
    target = null
    try {
      if (!window.isDestroyed()) window.unhookWindowMessage(WM_INPUT)
      register(RIDEV_REMOVE, 0)
    } catch (error) {
      console.warn('[holo] failed to release raw touch input:', error)
    }
  }
}

/** An HWND / HRAWINPUT handed over by Electron as a pointer-sized buffer. */
export function readHandle(buffer: Buffer): number {
  return Number(buffer.length >= 8 ? buffer.readBigUInt64LE(0) : buffer.readUInt32LE(0))
}
