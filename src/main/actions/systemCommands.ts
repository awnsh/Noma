import { SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import { KEYEVENTF_KEYUP, KeybdEvent } from './win32'

/**
 * A closed allowlist — never an arbitrary shell command, even though
 * ControlAction's `systemCommand` field is typed as a free string. Only
 * these exact names execute anything; everything else is refused. This is
 * the same "closed vocabulary, fail closed" posture as key-name execution
 * (see keyNames.ts) applied to system-level actions (brainstorm.md section
 * 16's caution about automating potentially dangerous actions).
 *
 * The set of valid *names* is shared with the renderer (SYSTEM_COMMAND_CATALOG)
 * so the Control Mapping Editor's dropdown can't list something this
 * refuses to run. The virtual-key mapping stays main-process-only.
 */
const VOLUME_VIRTUAL_KEYS: Record<string, number> = {
  volumeMute: 0xad,
  volumeUp: 0xaf,
  volumeDown: 0xae
}

export function isKnownSystemCommand(command: string): boolean {
  return SYSTEM_COMMAND_CATALOG.includes(command) && command in VOLUME_VIRTUAL_KEYS
}

/**
 * Sends one of the standard Windows multimedia virtual keys via
 * keybd_event. These are handled by the OS audio subsystem globally —
 * unlike a shortcut, no window needs to be focused first.
 */
export function executeSystemCommand(command: string): boolean {
  const virtualKey = VOLUME_VIRTUAL_KEYS[command]
  if (virtualKey === undefined) return false

  KeybdEvent(virtualKey, 0, 0, 0)
  KeybdEvent(virtualKey, 0, KEYEVENTF_KEYUP, 0)
  return true
}
