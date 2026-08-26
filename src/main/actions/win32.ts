import koffi from 'koffi'

/**
 * The single place user32.dll gets loaded and its functions declared —
 * shared by windowFocus.ts, windowClose.ts, and systemCommands.ts so
 * there's one definition of each signature, not three.
 *
 * Why koffi: it's an FFI library with N-API prebuilt binaries (same
 * reasoning as better-sqlite3/uiohook-napi — no C++ toolchain on this
 * machine, no compilation on install). This replaces what used to be a
 * spawned PowerShell child process per action with a direct, synchronous
 * call from Flow's own process — see windowFocus.ts for why that
 * distinction is exactly what makes the redesigned focus mechanism safe.
 */
const user32 = koffi.load('user32.dll')

export const GetForegroundWindow = user32.func('intptr_t GetForegroundWindow()')
export const SetForegroundWindow = user32.func('bool SetForegroundWindow(intptr_t hwnd)')
export const IsWindow = user32.func('bool IsWindow(intptr_t hwnd)')
// user32.dll exports PostMessageW/PostMessageA, not "PostMessage" itself —
// that name is only a C-header macro that resolves to one or the other.
export const PostMessage = user32.func(
  'bool PostMessageW(intptr_t hwnd, uint32_t msg, uintptr_t wParam, intptr_t lParam)'
)
export const KeybdEvent = user32.func(
  'void keybd_event(uint8_t bVk, uint8_t bScan, uint32_t dwFlags, uintptr_t dwExtraInfo)'
)

export const WM_CLOSE = 0x0010
export const KEYEVENTF_KEYUP = 0x0002
