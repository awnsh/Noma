import { spawn, type ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import type { RawClickInspection } from './clickTarget'
import { elementAtPoint } from '../actions/macos'
import { isMac } from '../platform'

/** What the helper reports about the control under a screen point. `name`
 *  is the RAW accessible name; it never leaves the main process unsanitized
 *  (clickTarget.ts's clickTargetFor is the only consumer). */
export interface ClickInspection extends RawClickInspection {
  processId: number | null
}

export interface ClickInspector {
  inspect(x: number, y: number): Promise<ClickInspection | null>
  dispose(): void
}

/** Hit-testing plus, for WinUI/Electron containers, a search of the window
 *  for the control under the point: ~50-200 ms, sometimes ~600 ms right
 *  after the helper starts. Past this the click falls back to a grid zone. */
const INSPECT_TIMEOUT_MS = 1000
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
 * UIs (many media/creative tools) often expose only a window: the caller
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
$AE = [System.Windows.Automation.AutomationElement]
$CT = [System.Windows.Automation.ControlType]
$commandTypes = @($CT::Button, $CT::SplitButton, $CT::MenuItem, $CT::CheckBox, $CT::RadioButton)
$commandCond = New-Object System.Windows.Automation.OrCondition(@($commandTypes | ForEach-Object {
  New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $_)
}))
# What a hit-test may land on in place of the real control: the host window of
# a WinUI/XAML island (new Notepad, Settings, Terminal) or a Chromium/Electron
# web area. Hit-testing stops at those instead of descending into them.
$containerNames = @('ControlType.Pane', 'ControlType.Window', 'ControlType.Group', 'ControlType.Custom', 'ControlType.Document')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $parts = $line.Split(' ')
  $out = @{ id = $parts[0]; controlType = $null; name = $null; pid = $null; l = $null; t = $null; r = $null; b = $null }
  try {
    $pt = New-Object System.Windows.Point ([double]$parts[1]), ([double]$parts[2])
    $el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
    # Landed on a container: look inside it for the command control under the
    # point (the smallest one that contains it). Only command controls are
    # looked for, so this can't widen what's recorded; clickTarget.ts still
    # decides what may be kept.
    if ($el -ne $null -and $containerNames -contains $el.Current.ControlType.ProgrammaticName) {
      # Search the whole top-level window the point is in, not the
      # container: an app like Notepad hosts its menu bar in one island and
      # its document in another, and the hit-test can land on either.
      $scope = $el
      for ($i = 0; $i -lt 25; $i++) {
        $parent = $walker.GetParent($scope)
        if ($parent -eq $null -or $parent -eq $root) { break }
        $scope = $parent
      }
      $best = $null; $bestArea = [double]::MaxValue
      try {
        foreach ($candidate in $scope.FindAll([System.Windows.Automation.TreeScope]::Descendants, $commandCond)) {
          $r = $candidate.Current.BoundingRectangle
          if ($r.IsEmpty -or -not $r.Contains($pt)) { continue }
          $area = $r.Width * $r.Height
          if ($area -lt $bestArea) { $best = $candidate; $bestArea = $area }
        }
      } catch { }
      if ($best -ne $null) { $el = $best }
    }
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

/**
 * macOS: the same question asked of the Accessibility API, in-process
 * (actions/macos.ts). One hit-test plus a few attribute reads, so it's quick
 * enough not to need a helper process. Roles are reported as the UI
 * Automation control-type names, so clickTarget.ts's rules apply unchanged.
 */
export class MacAxClickInspector implements ClickInspector {
  async inspect(x: number, y: number): Promise<ClickInspection | null> {
    const element = elementAtPoint(x, y)
    if (!element) return null
    return { controlType: element.controlType, name: element.name, processId: element.pid, window: element.window }
  }

  dispose(): void {}
}

/** The inspector for this OS. */
export function createClickInspector(): ClickInspector {
  return isMac ? new MacAxClickInspector() : new UiaClickInspector()
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
