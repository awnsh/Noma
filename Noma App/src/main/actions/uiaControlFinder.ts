import { spawn, type ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { findNamedControls } from './macos'
import { isMac } from '../platform'

/** The helper script's Normalize, for the macOS search: "&Delete" ->
 *  "Delete", trailing "..." dropped, whitespace collapsed. */
function normalizeControlName(name: string): string {
  return name
    .replace(/&(?=\S)/g, '')
    .replace(/(\.{3}|…)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Finds a named command control (button, menu item, check/radio box) in a
 * running app, for replaying a learned `label:` click: the replay-side
 * counterpart of uiaInspector.ts, which reads the name at capture time.
 *
 * It only *finds*; it never invokes. click.ts then clicks the point it
 * returns with a real mouse click, like the user's own, after checking the
 * point is inside the expected app's window. Two reasons not to use UI
 * Automation's InvokePattern instead: some apps block the Invoke call until
 * a dialog it opened is closed (which would hang every later replay), and a
 * real click is exactly what was recorded, so it behaves the same in every
 * app, menus included.
 *
 * Matching uses the same cleanup clickTarget.ts's sanitizeControlLabel
 * applies at capture ("&Delete" -> "Delete", trailing "..." dropped,
 * whitespace collapsed), case-insensitive, and only among enabled, on-screen
 * controls of the command types capture accepts. The label is passed
 * base64-encoded, so no text from a stored workflow ever becomes part of a
 * PowerShell command.
 *
 * Searches every top-level window of the process, not the foreground
 * one: an open menu or a dialog is its own top-level window.
 */
const HELPER_SCRIPT = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System.Runtime.InteropServices;
public class FlowFinderDpi { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }
"@
# Physical pixels, the same coordinate space the click is sent in.
[FlowFinderDpi]::SetProcessDPIAware() | Out-Null

$AE = [System.Windows.Automation.AutomationElement]
$CT = [System.Windows.Automation.ControlType]
$typeConds = @($CT::Button, $CT::SplitButton, $CT::MenuItem, $CT::CheckBox, $CT::RadioButton) | ForEach-Object {
  New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $_)
}
$typeCond = New-Object System.Windows.Automation.OrCondition($typeConds)

function Normalize([string]$name) {
  if ($name -eq $null) { return '' }
  $name = $name -replace '&(?=\\S)', ''
  $name = $name -replace '(\\.{3}|\\u2026)\\s*$', ''
  return ($name -replace '\\s+', ' ').Trim()
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $parts = $line.Split(' ')
  $out = @{ id = $parts[0]; found = 0; x = $null; y = $null }
  try {
    $procId = [int]$parts[1]
    $label = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[2]))
    $procCond = New-Object System.Windows.Automation.PropertyCondition($AE::ProcessIdProperty, $procId)
    $tops = $AE::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $procCond)
    $hits = New-Object System.Collections.ArrayList
    foreach ($top in $tops) {
      foreach ($el in $top.FindAll([System.Windows.Automation.TreeScope]::Descendants, $typeCond)) {
        try {
          if ($el.Current.IsOffscreen -or -not $el.Current.IsEnabled) { continue }
          if ((Normalize $el.Current.Name) -ieq $label) { [void]$hits.Add($el) }
        } catch { }
      }
    }
    $out.found = $hits.Count
    if ($hits.Count -eq 1) {
      $point = New-Object System.Windows.Point
      if ($hits[0].TryGetClickablePoint([ref]$point)) {
        $out.x = [int]$point.X; $out.y = [int]$point.Y
      } else {
        $rect = $hits[0].Current.BoundingRectangle
        if (-not $rect.IsEmpty) { $out.x = [int]($rect.Left + $rect.Width / 2); $out.y = [int]($rect.Top + $rect.Height / 2) }
      }
    }
  } catch { }
  Write-Output ($out | ConvertTo-Json -Compress)
}
`

export type FindResult =
  | { status: 'found'; x: number; y: number }
  | { status: 'none' }
  | { status: 'several'; count: number }
  | { status: 'unavailable' }

/** One search can walk a big UI tree; past this, give up on that attempt. */
const FIND_TIMEOUT_MS = 2500
/** The first search also waits for PowerShell to load UI Automation (~1 s
 *  here, several on a slow machine), so it gets longer. */
const FIRST_FIND_TIMEOUT_MS = 8000

interface HelperAnswer {
  id: string
  found: number
  x: number | null
  y: number | null
}

class UiaControlFinder {
  private child: ChildProcess | null = null
  private nextId = 1
  private readonly pending = new Map<string, (answer: HelperAnswer | null) => void>()
  /** True once the helper has answered anything, i.e. it has finished loading. */
  private ready = false

  /** Starts the helper ahead of the first search (a macro that's about to
   *  need it calls this at its start). */
  warmUp(): void {
    if (isMac) return // the AX search runs in-process; nothing to start
    this.ensureStarted()
  }

  find(processId: number, label: string): Promise<FindResult> {
    if (isMac) return findNamedControls(processId, label, normalizeControlName)
    const child = this.ensureStarted()
    if (!child?.stdin?.writable) return Promise.resolve({ status: 'unavailable' })
    const id = String(this.nextId++)
    const encoded = Buffer.from(label, 'utf8').toString('base64')
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => {
          this.pending.delete(id)
          resolve({ status: 'unavailable' })
        },
        this.ready ? FIND_TIMEOUT_MS : FIRST_FIND_TIMEOUT_MS
      )
      this.pending.set(id, (answer) => {
        clearTimeout(timer)
        if (!answer) return resolve({ status: 'unavailable' })
        if (answer.found === 0) return resolve({ status: 'none' })
        if (answer.found > 1) return resolve({ status: 'several', count: answer.found })
        if (answer.x === null || answer.y === null) return resolve({ status: 'none' })
        resolve({ status: 'found', x: answer.x, y: answer.y })
      })
      child.stdin!.write(`${id} ${Math.trunc(processId)} ${encoded}\n`)
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
      const clear = (): void => {
        if (this.child !== child) return
        this.child = null
        this.ready = false
      }
      child.on('exit', clear)
      child.on('error', clear)
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
    this.ready = true
    const resolve = this.pending.get(answer.id)
    if (!resolve) return
    this.pending.delete(answer.id)
    resolve(answer)
  }
}

/** Shared, started on first use (the PowerShell helper takes ~1 s to load
 *  UI Automation, so it's kept alive rather than started per click). */
export const uiaControlFinder = new UiaControlFinder()
