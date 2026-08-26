import { spawn } from 'child_process'

/**
 * A closed allowlist — never an arbitrary shell command, even though
 * ControlAction's `systemCommand` field is typed as a free string. Only
 * these exact names execute anything; everything else is refused. This is
 * the same "closed vocabulary, fail closed" posture as key-name execution
 * (see keyNames.ts) applied to system-level actions (brainstorm.md section
 * 16's caution about automating potentially dangerous actions).
 */
const VOLUME_VIRTUAL_KEYS: Record<string, number> = {
  volumeMute: 0xad,
  volumeUp: 0xaf,
  volumeDown: 0xae
}

export function isKnownSystemCommand(command: string): boolean {
  return command in VOLUME_VIRTUAL_KEYS
}

/**
 * Sends one of the standard Windows multimedia virtual keys via
 * keybd_event. These are handled by the OS audio subsystem globally —
 * unlike a shortcut, no window needs to be focused first.
 */
export async function executeSystemCommand(command: string): Promise<boolean> {
  const virtualKey = VOLUME_VIRTUAL_KEYS[command]
  if (virtualKey === undefined) return false

  const script = `
Add-Type @"
using System.Runtime.InteropServices;
public class FlowVolume {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@
[FlowVolume]::keybd_event(${virtualKey}, 0, 0, [UIntPtr]::Zero)
[FlowVolume]::keybd_event(${virtualKey}, 0, 2, [UIntPtr]::Zero)
`

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: 'ignore'
    })
    const timer = setTimeout(() => {
      child.kill()
      resolve(false)
    }, 3000)
    child.on('exit', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}
