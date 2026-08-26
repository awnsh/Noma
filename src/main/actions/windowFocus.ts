import { spawn } from 'child_process'

/**
 * Best-effort: brings the given window handle to the foreground, then
 * verifies it actually worked before returning.
 *
 * Why not a plain SetForegroundWindow call: Windows restricts which
 * process can steal the foreground — generally only the process that most
 * recently received user input is allowed to. A short-lived PowerShell
 * process spawned *after* the user's click never received that input
 * itself, so a naive SetForegroundWindow from it is likely to silently
 * fail (Windows just flashes the target's taskbar icon instead). The
 * AttachThreadInput dance below is the standard, well-established
 * workaround: temporarily attach input state to the currently-foreground
 * window's thread (which the user DID just click into) before asking for
 * the switch.
 *
 * Fails closed: if the resulting foreground window doesn't match the
 * target, returns false rather than proceeding — callers must not send a
 * synthetic keystroke without this confirming true first (see
 * actionExecutor.ts). Sending a shortcut to the wrong window is worse than
 * not sending it at all.
 */
export async function focusWindowAndVerify(targetHwnd: number): Promise<boolean> {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FlowFocus {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
"@

$targetHwnd = [IntPtr]${targetHwnd}
$currentFg = [FlowFocus]::GetForegroundWindow()
$callingThreadId = [FlowFocus]::GetCurrentThreadId()
$fgThreadId = 0
[FlowFocus]::GetWindowThreadProcessId($currentFg, [ref]$fgThreadId) | Out-Null
$targetThreadId = 0
[FlowFocus]::GetWindowThreadProcessId($targetHwnd, [ref]$targetThreadId) | Out-Null

[FlowFocus]::AttachThreadInput($fgThreadId, $targetThreadId, $true) | Out-Null
[FlowFocus]::ShowWindow($targetHwnd, 5) | Out-Null
[FlowFocus]::BringWindowToTop($targetHwnd) | Out-Null
[FlowFocus]::SetForegroundWindow($targetHwnd) | Out-Null
[FlowFocus]::AttachThreadInput($fgThreadId, $targetThreadId, $false) | Out-Null

Start-Sleep -Milliseconds 60
Write-Output ([int64][FlowFocus]::GetForegroundWindow())
`

  const resultingHwnd = await runPowerShell(script)
  if (resultingHwnd === null) return false
  return Number(resultingHwnd.trim()) === targetHwnd
}

function runPowerShell(script: string, timeoutMs = 3000): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    })

    let output = ''
    let settled = false
    const finish = (value: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }

    const timer = setTimeout(() => {
      child.kill()
      finish(null)
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('exit', (code) => finish(code === 0 ? output : null))
    child.on('error', () => finish(null))
  })
}
