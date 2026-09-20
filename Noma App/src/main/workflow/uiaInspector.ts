import { spawn, type ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import type { RawClickInspection } from './clickTarget'

/** What the helper reports about the control under a screen point. `name`
 *  is the RAW accessible name — it never leaves the main process unsanitized
 *  (clickTarget.ts's clickTargetFor is the only consumer). */
export interface ClickInspection extends RawClickInspection {
  processId: number | null
}

export interface ClickInspector {
  inspect(x: number, y: number): Promise<ClickInspection | null>
  dispose(): void
}

const INSPECT_TIMEOUT_MS = 600
const MAX_PENDING = 4

/**
 * Asks Windows UI Automation "what control is at this screen point?" via one
 * long-lived PowerShell helper (same approach and reasoning as
 * windowsAdapter.ts: no C++ toolchain here, and one persistent process
 * avoids a spawn per click). Reads `id x y` lines on stdin, writes one JSON
 * line per answer.
 *
 * Honest limits: UI Automation only sees what an app chooses to expose.
 * Win32/WPF/UWP apps and browsers/Electron apps generally do; custom-drawn
 * UIs (many media/creative tools) often expose only a window — the caller
 * falls back to a window grid zone for those (clickTarget.ts).
 *
 * Nothing here is stored or logged: this class only relays one answer per
 * click back to the caller, which sanitizes it.
 */
const HELPER_SCRIPT = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase
Add-Type @"
using System.Runtime.InteropServices;
public class FlowDpi { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }
"@
# Without this, this process sees DPI-virtualized coordinates and every point
# is wrong on a scaled display.
[FlowDpi]::SetProcessDPIAware() | Out-Null

$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$root = [System.Windows.Automation.AutomationElement]::RootElement
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $parts = $line.Split(' ')
  $out = @{ id = $parts[0]; controlType = $null; name = $null; pid = $null; l = $null; t = $null; r = $null; b = $null }
  try {
    $pt = New-Object System.Windows.Point ([double]$parts[1]), ([double]$parts[2])
    $el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
    if ($el -ne $null) {
      $out.controlType = $el.Current.ControlType.ProgrammaticName
      $name = $el.Current.Name
      if ($name -ne $null -and $name.Length -gt 80) { $name = $name.Substring(0, 80) }
      $out.name = $name
      $out.pid = $el.Current.ProcessId
      $top = $el
      for ($i = 0; $i -lt 25; $i++) {
        $parent = $walker.GetParent($top)
        if ($parent -eq $null -or $parent -eq $root) { break }
        $top = $parent
      }
      $rect = $top.Current.BoundingRectangle
      if (-not $rect.IsEmpty) {
        $out.l = [int]$rect.Left; $out.t = [int]$rect.Top; $out.r = [int]$rect.Right; $out.b = [int]$rect.Bottom
      }
    }
  } catch { }
  Write-Output ($out | ConvertTo-Json -Compress)
}
`

interface HelperAnswer {
  id: string
  controlType: string | null
  name: string | null
  pid: number | null
  l: number | null
  t: number | null
  r: number | null
  b: number | null
}

export class UiaClickInspector implements ClickInspector {
  private child: ChildProcess | null = null
  private nextId = 1
  private readonly pending = new Map<string, (answer: ClickInspection | null) => void>()

  inspect(x: number, y: number): Promise<ClickInspection | null> {
    if (this.pending.size >= MAX_PENDING) return Promise.resolve(null)
    const child = this.ensureStarted()
    if (!child?.stdin?.writable) return Promise.resolve(null)

    const id = String(this.nextId++)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        resolve(null)
      }, INSPECT_TIMEOUT_MS)
      this.pending.set(id, (answer) => {
        clearTimeout(timer)
        resolve(answer)
      })
      child.stdin!.write(`${id} ${Math.round(x)} ${Math.round(y)}\n`)
    })
  }

  dispose(): void {
    for (const resolve of this.pending.values()) resolve(null)
    this.pending.clear()
    this.child?.kill()
    this.child = null
  }

  private ensureStarted(): ChildProcess | null {
    if (this.child) return this.child
    try {
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', HELPER_SCRIPT],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] }
      )
      createInterface({ input: child.stdout! }).on('line', (line) => this.handleLine(line))
      child.on('exit', () => {
        if (this.child === child) this.child = null
      })
      child.on('error', () => {
        if (this.child === child) this.child = null
      })
      this.child = child
      return child
    } catch {
      return null
    }
  }

  private handleLine(line: string): void {
    let answer: HelperAnswer
    try {
      answer = JSON.parse(line) as HelperAnswer
    } catch {
      return
    }
    const resolve = this.pending.get(answer.id)
    if (!resolve) return
    this.pending.delete(answer.id)
    const hasRect = answer.l !== null && answer.t !== null && answer.r !== null && answer.b !== null
    resolve({
      controlType: answer.controlType,
      name: answer.name,
      processId: answer.pid,
      window: hasRect ? { left: answer.l!, top: answer.t!, right: answer.r!, bottom: answer.b! } : null
    })
  }
}
