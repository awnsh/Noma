import { SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import { execFile } from 'child_process'
import { KEYEVENTF_KEYUP, KeybdEvent } from './win32'
import { NX_KEYTYPE_NEXT, NX_KEYTYPE_PLAY, NX_KEYTYPE_PREVIOUS, postMediaKey } from './macMediaKeys'
import { isMac, isWindows } from '../platform'

/**
 * A closed allowlist; never an arbitrary shell command, even though
 * ControlAction's `systemCommand` field is typed as a free string. Only
 * these exact names execute anything; everything else is refused. This is
 * the same "closed vocabulary, fail closed" posture as key-name execution
 * (see keyNames.ts) applied to system-level actions (brainstorm.md section
 * 16's caution about automating potentially dangerous actions).
 *
 * The set of valid *names* is shared with the renderer (SYSTEM_COMMAND_CATALOG)
 * so the Control Mapping Editor's dropdown can't list something this
 * refuses to run. The per-platform mapping stays main-process-only, and a
 * name counts as known only if *both* platforms below can run it.
 *
 * No microphone mute: Windows has no virtual key for it, and
 * WM_APPCOMMAND's APPCOMMAND_MICROPHONE_VOLUME_MUTE only works if the
 * focused app or a vendor driver chooses to handle it. The real switch is
 * Core Audio's IAudioEndpointVolume::SetMute, a COM call this codebase has
 * no binding for, so offering it would mean a command that silently does
 * nothing on most machines.
 */
const WINDOWS_VIRTUAL_KEYS: Record<string, number> = {
  volumeMute: 0xad,
  volumeUp: 0xaf,
  volumeDown: 0xae,
  mediaPlayPause: 0xb3, // VK_MEDIA_PLAY_PAUSE
  mediaNextTrack: 0xb0, // VK_MEDIA_NEXT_TRACK
  mediaPrevTrack: 0xb1 // VK_MEDIA_PREV_TRACK
}

/** Volume on macOS: AppleScript's own volume commands need no permission.
 *  Fixed scripts only, never built from input. */
const MAC_VOLUME_SCRIPTS: Record<string, string> = {
  volumeMute: 'set volume output muted (not (output muted of (get volume settings)))',
  volumeUp: 'set volume output volume ((output volume of (get volume settings)) + 6)',
  volumeDown: 'set volume output volume ((output volume of (get volume settings)) - 6)'
}

/** Media keys on macOS: the system-defined key events the keyboard's own
 *  F7–F9 send (macMediaKeys.ts), which go to whichever app owns Now Playing. */
const MAC_MEDIA_KEYS: Record<string, number> = {
  mediaPlayPause: NX_KEYTYPE_PLAY,
  mediaNextTrack: NX_KEYTYPE_NEXT,
  mediaPrevTrack: NX_KEYTYPE_PREVIOUS
}

export function isKnownSystemCommand(command: string): boolean {
  return (
    SYSTEM_COMMAND_CATALOG.includes(command) &&
    Object.hasOwn(WINDOWS_VIRTUAL_KEYS, command) &&
    (Object.hasOwn(MAC_VOLUME_SCRIPTS, command) || Object.hasOwn(MAC_MEDIA_KEYS, command))
  )
}

/**
 * Runs one allowlisted command. True only when the OS was actually handed
 * the key/script; false for an unknown name, an unsupported platform, or
 * (macOS media keys) missing Accessibility permission. The caller turns
 * false into the reason the user sees.
 *
 * Windows: the standard multimedia virtual keys via keybd_event. These are
 * handled by the OS globally; unlike a shortcut, no window needs focus.
 */
export function executeSystemCommand(command: string): boolean {
  if (!isKnownSystemCommand(command)) return false

  if (isMac) {
    const script = MAC_VOLUME_SCRIPTS[command]
    if (script !== undefined) {
      execFile('osascript', ['-e', script], () => {})
      return true
    }
    const keyType = MAC_MEDIA_KEYS[command]
    return keyType !== undefined && postMediaKey(keyType)
  }

  if (!isWindows) return false
  const virtualKey = WINDOWS_VIRTUAL_KEYS[command]
  try {
    KeybdEvent(virtualKey, 0, 0, 0)
    KeybdEvent(virtualKey, 0, KEYEVENTF_KEYUP, 0)
    return true
  } catch {
    return false
  }
}
