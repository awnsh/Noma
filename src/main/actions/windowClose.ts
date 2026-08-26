import { spawn } from 'child_process'

const WM_CLOSE = 0x0010

/**
 * Posts WM_CLOSE directly to a window handle — the exact same message a
 * title bar's X button sends (brainstorm.md-adjacent principle, prompted
 * directly by a real incident: see BLOCKED_COMBOS in actionExecutor.ts).
 *
 * Unlike a synthesized Ctrl+W, this needs no focus and no keystroke:
 * PostMessage can target any window regardless of what's currently
 * focused, so none of windowFocus.ts's AttachThreadInput dance — and the
 * risk that came with it — applies here at all. The target application
 * decides how to respond to WM_CLOSE, including declining to close by
 * raising an "unsaved changes" prompt, exactly as it would for a real
 * click on X. This is never a forceful kill (no TerminateProcess, ever).
 *
 * Returns whether the message was successfully delivered, not whether the
 * window actually closed — that's the app's call, same as a real click.
 */
export async function closeWindowGracefully(targetHwnd: number): Promise<boolean> {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FlowClose {
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@
$result = [FlowClose]::PostMessage([IntPtr]${targetHwnd}, ${WM_CLOSE}, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Output $result
`

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    })

    let output = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve(false)
    }, 3000)

    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      resolve(code === 0 && output.trim().toLowerCase() === 'true')
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}
