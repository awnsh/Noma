import { spawn, type ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import type { Application } from '@shared/types'
import type { OSAdapter } from './types'

interface RawForegroundWindowEvent {
  processId: number
  processName: string
  windowTitle: string
  path: string | null
  hwnd: number
}

/**
 * Polls the Windows foreground window via a single long-lived PowerShell
 * helper process (Win32 P/Invoke: GetForegroundWindow /
 * GetWindowThreadProcessId), which prints one JSON line whenever the
 * foreground process changes.
 *
 * Why PowerShell instead of a native Node addon: a real native module
 * (the originally-planned approach — see docs/architecture.md) needs a
 * C++ toolchain (node-gyp + Python + MSVC build tools) to compile, which
 * this machine doesn't have, and no actively-maintained npm package ships
 * a working prebuilt binary for this exact call. Shelling out to a single
 * persistent PowerShell process avoids that dependency entirely while
 * still avoiding per-poll process-spawn overhead (only one process is
 * spawned for the lifetime of the adapter).
 *
 * Honesty about "event-driven": this is polling (every 400ms) inside the
 * helper process, not a true Win32 SetWinEventHook subscription — but
 * Node's side of the interface (`onActiveApplicationChanged`) is a real
 * push callback, so callers don't know or care. A future optimization can
 * replace the polling loop in POLL_SCRIPT with a SetWinEventHook + message
 * pump without changing this class's public shape at all.
 *
 * Flow's own window is deliberately excluded from detection (see
 * `${flowProcessId}` below). Without this, clicking anything in the Flow
 * app itself — including a Virtual Keyboard control — would make Flow the
 * "active application", flipping Current Application/Controls to nothing
 * every time the user touches the app. A real physical keyboard doesn't
 * have this problem (pressing a button doesn't steal window focus), so
 * the virtual one shouldn't either. This also means `lastKnownHwnd` always
 * holds the real target window's handle, which is what makes refocus-then-
 * execute (actionExecutor.ts) possible at all.
 */

const POLL_INTERVAL_MS = 400

const POLL_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class FlowWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

$flowProcessId = ${process.pid}
$lastProcessId = -1
while ($true) {
  try {
    $hwnd = [FlowWin32]::GetForegroundWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
      $procId = 0
      [FlowWin32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
      if ($procId -ne 0 -and $procId -ne $flowProcessId -and $procId -ne $lastProcessId) {
        try {
          $proc = Get-Process -Id $procId -ErrorAction Stop
          $sb = New-Object System.Text.StringBuilder 256
          [FlowWin32]::GetWindowText($hwnd, $sb, 256) | Out-Null
          $result = [PSCustomObject]@{
            processId = $procId
            processName = $proc.ProcessName
            windowTitle = $sb.ToString()
            path = $proc.Path
            hwnd = [int64]$hwnd
          }
          Write-Output ($result | ConvertTo-Json -Compress)
          $lastProcessId = $procId
        } catch {
          # Process exited between calls, or access denied (elevated
          # process). Skip this tick and try again next poll.
        }
      }
    }
  } catch {
    # Ignore transient errors; keep polling.
  }
  Start-Sleep -Milliseconds ${POLL_INTERVAL_MS}
}
`

function toApplication(raw: RawForegroundWindowEvent): Application {
  const fileName = raw.path
    ? (raw.path.split(/[\\/]/).pop() ?? `${raw.processName}.exe`)
    : `${raw.processName}.exe`
  const id = fileName.toLowerCase().replace(/\.exe$/, '')

  return {
    id,
    name: raw.processName,
    processName: fileName
  }
}

export class WindowsOSAdapter implements OSAdapter {
  private child: ChildProcess | null = null
  private current: Application | null = null
  private lastKnownHwnd: number | null = null
  private listeners = new Set<(app: Application | null) => void>()

  async getActiveApplication(): Promise<Application | null> {
    this.ensureWatcherStarted()
    return this.current
  }

  onActiveApplicationChanged(callback: (app: Application | null) => void): () => void {
    this.ensureWatcherStarted()
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /** The window handle of the most recent real (non-Flow) foreground
   *  application — used to refocus that window before synthesizing a
   *  keystroke for it. Null until some real application has been seen. */
  getLastKnownWindowHandle(): number | null {
    return this.lastKnownHwnd
  }

  /** Stops the helper process. Call on app quit. */
  dispose(): void {
    this.child?.kill()
    this.child = null
    this.listeners.clear()
  }

  private ensureWatcherStarted(): void {
    if (this.child) return

    this.child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', POLL_SCRIPT], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    if (this.child.stdout) {
      const rl = createInterface({ input: this.child.stdout })
      rl.on('line', (line) => {
        const trimmed = line.trim()
        if (!trimmed) return
        try {
          const raw = JSON.parse(trimmed) as RawForegroundWindowEvent
          const application = toApplication(raw)
          this.current = application
          this.lastKnownHwnd = raw.hwnd
          for (const listener of this.listeners) listener(application)
        } catch {
          // Malformed/partial line — ignore, next line will resync.
        }
      })
    }

    this.child.on('exit', () => {
      this.child = null
    })

    this.child.on('error', () => {
      this.child = null
    })
  }
}
