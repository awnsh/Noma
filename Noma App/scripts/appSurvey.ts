/**
 * What would Flow record in each app? A live, read-only survey: for every
 * app named on the command line it brings the app's window to the front,
 * finds real controls on screen (buttons, menus, tabs, text, lists, the
 * canvas), hit-tests each one with Flow's REAL inspector (the same UI
 * Automation helper capture uses), and runs that through the REAL capture
 * pipeline (ClickCaptureService.handlePress) as a plain click, a drag, a
 * double-click and a Shift+click. Nothing is clicked, typed or stored.
 *
 * It then grades the outcome against what Flow should do:
 *   button / menu item    click -> label:<name>    (chat/meeting/AI apps: nothing)
 *   text / document       click -> nothing          drag, double-click -> select
 *   list / tree item      click -> select
 *   browser tab           click -> tab:<fingerprint>
 *   link                  click -> nothing
 *   opaque canvas         click -> zone (not in browsers)   drag -> select
 * and reports inspector latency (a lookup past 1 s is a lost click).
 *
 * Bundle: npx esbuild scripts/appSurvey.ts --bundle --platform=node --external:koffi
 *           --external:uiohook-napi --alias:@shared=./src/shared --outfile=<tmp>.cjs
 * Run:    NODE_PATH=node_modules node <tmp>.cjs <processName> [<processName>...]
 *         (process names as Task Manager shows them, without .exe: chrome notepad code)
 *
 * Windows only. If Noma itself is running with Flow learning on, bringing
 * each app forward is recorded as an app switch; clean those up afterwards.
 */
import { execFileSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { UiaClickInspector, type ClickInspection } from '../src/main/workflow/uiaInspector'
import { ClickCaptureService, type CapturedClickEvent, type Press } from '../src/main/workflow/clickCaptureService'
import { categoryOf, isClickCaptureExcluded } from '../src/main/workflow/appKnowledge'
import { sanitizeControlLabel } from '../src/main/workflow/clickTarget'

const DISCOVER_SCRIPT = String.raw`
param([string]$name)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class SurveyWin {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, int flags, int extra);
}
"@
[SurveyWin]::SetProcessDPIAware() | Out-Null
$AE = [System.Windows.Automation.AutomationElement]
$CT = [System.Windows.Automation.ControlType]
$procs = @(Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 })
if ($procs.Count -eq 0) { Write-Output '{"error":"no window"}'; exit }
$h = $procs[0].MainWindowHandle
if ([SurveyWin]::IsIconic($h)) { [SurveyWin]::ShowWindow($h, 9) | Out-Null }
for ($i = 0; $i -lt 20 -and [SurveyWin]::GetForegroundWindow() -ne $h; $i++) {
  # A bare Alt press lets a background process take the foreground.
  [SurveyWin]::keybd_event(0x12, 0, 0, 0); [SurveyWin]::keybd_event(0x12, 0, 2, 0)
  [SurveyWin]::SetForegroundWindow($h) | Out-Null
  Start-Sleep -Milliseconds 150
}
Start-Sleep -Milliseconds 700
$win = $AE::FromHandle($h)
$pids = @($procs | ForEach-Object { $_.Id })
$wr = $win.Current.BoundingRectangle
$types = @('Button','MenuItem','TabItem','Edit','Document','Text','ListItem','DataItem','TreeItem','Hyperlink','Pane','Custom')
$out = @()
foreach ($t in $types) {
  $cond = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::$t)
  try { $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond) } catch { continue }
  $picked = 0
  $step = [Math]::Max(1, [Math]::Floor($all.Count / 8))
  for ($k = 0; $k -lt $all.Count -and $picked -lt 6; $k += $step) {
    $e = $all[$k]
    try {
      if ($e.Current.IsOffscreen) { continue }
      $r = $e.Current.BoundingRectangle
      if ($r.IsEmpty -or $r.Width -lt 4 -or $r.Height -lt 4) { continue }
      $x = [int]($r.Left + $r.Width / 2); $y = [int]($r.Top + $r.Height / 2)
      if ($x -lt $wr.Left -or $x -ge $wr.Right -or $y -lt $wr.Top -or $y -ge $wr.Bottom) { continue }
      $out += @{ type = $t; x = $x; y = $y; w = [int]$r.Width; h = [int]$r.Height }
      $picked++
    } catch { }
  }
}
@{ foreground = ([SurveyWin]::GetForegroundWindow() -eq $h); pids = $pids; points = $out } | ConvertTo-Json -Depth 4 -Compress
`

interface Discovered {
  type: string
  x: number
  y: number
  w: number
  h: number
}

interface Discovery {
  error?: string
  foreground?: boolean
  pids?: number[]
  points?: Discovered[]
}

const scriptPath = join(tmpdir(), 'noma-app-survey.ps1')
writeFileSync(scriptPath, DISCOVER_SCRIPT)

function discover(processName: string): Discovery {
  const raw = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, processName],
    { encoding: 'utf8', timeout: 120_000, windowsHide: true }
  )
  const parsed = JSON.parse(raw.trim()) as Discovery
  if (parsed.points && !Array.isArray(parsed.points)) parsed.points = [parsed.points as unknown as Discovered]
  return parsed
}

function processNameOf(pid: number): string {
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).ProcessName`], {
      encoding: 'utf8',
      windowsHide: true
    }).trim()
  } catch {
    return String(pid)
  }
}

let webViews: Set<number> | null = null
function webViewPids(): Set<number> {
  if (!webViews) {
    const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command', '(Get-Process msedgewebview2 -ErrorAction SilentlyContinue).Id'], {
      encoding: 'utf8',
      windowsHide: true
    })
    webViews = new Set(raw.split(/\s+/).filter(Boolean).map(Number))
  }
  return webViews
}

type Shape = 'click' | 'drag' | 'double' | 'shift'
const SHAPES: Shape[] = ['click', 'drag', 'double', 'shift']

function pressFor(shape: Shape, point: Discovered, applicationId: string, inspection: ClickInspection | null): Press {
  // A drag stays inside the control when it's big enough (selecting text),
  // else it runs off it the way a real drag would.
  const dx = Math.max(12, Math.min(60, point.w / 3))
  return {
    x: point.x,
    y: point.y,
    upX: shape === 'drag' ? point.x + dx : point.x,
    upY: point.y,
    applicationId,
    timestamp: Date.now(),
    repeatPress: shape === 'double',
    extending: shape === 'shift',
    inspection: Promise.resolve(inspection)
  }
}

/** What Flow should record, from the HIT control type, or null when any
 *  outcome is acceptable. */
function expected(shape: Shape, inspection: ClickInspection, applicationId: string): string | null {
  const { controlType: hitType, name } = inspection
  const browser = categoryOf(applicationId) === 'browser'
  const excluded = isClickCaptureExcluded(applicationId)
  const t = (hitType ?? '').replace('ControlType.', '')
  const text = ['Edit', 'Document', 'Text'].includes(t)
  const item = ['ListItem', 'DataItem', 'TreeItem'].includes(t)
  const command = ['Button', 'SplitButton', 'MenuItem', 'CheckBox', 'RadioButton'].includes(t)
  const surface = ['Pane', 'Custom', 'Group', 'List', 'Table', 'Tree', 'DataGrid'].includes(t)
  // Lists, tables and trees hold content (files, rows): a click on their
  // empty space is never recorded, not even as a position.
  const container = ['List', 'Table', 'Tree', 'DataGrid'].includes(t)
  switch (shape) {
    case 'click':
      if (inspection.context) return 'nothing'
      if (item) return 'select'
      if (text || t === 'Hyperlink' || t === 'Image') return 'nothing'
      if (command) {
        if (excluded) return 'nothing'
        return sanitizeControlLabel(hitType, name) ? 'label' : 'nothing'
      }
      // Outside a browser a tab is named after content (a file, a sheet),
      // so it's recorded by position only.
      if (t === 'TabItem') return excluded ? 'nothing' : browser ? 'tab' : 'zone'
      if (container) return 'nothing'
      if (surface) return excluded || browser ? 'nothing' : 'zone'
      return null
    case 'drag':
      return text || item || surface ? 'select' : 'nothing'
    case 'double':
      return text ? 'select' : 'nothing'
    case 'shift':
      return text || item || surface ? 'select' : null
  }
}

function kindOf(events: CapturedClickEvent[]): string {
  const target = events[0]?.clickTarget
  if (!target) return 'nothing'
  if (target === 'select') return 'select'
  return target.split(':')[0]
}

async function surveyApp(processName: string, inspector: UiaClickInspector): Promise<void> {
  const applicationId = processName.toLowerCase()
  console.log(`\n=== ${processName}  (category: ${categoryOf(applicationId) ?? 'unknown'}${isClickCaptureExcluded(applicationId) ? ', buttons excluded' : ''})`)
  let found: Discovery
  try {
    found = discover(processName)
  } catch (error) {
    console.log(`  discovery failed: ${(error as Error).message.split('\n')[0]}`)
    return
  }
  if (found.error) return console.log(`  ${found.error}`)
  if (!found.foreground) console.log('  WARNING: could not bring the window to the front; covered points are skipped')

  const pids = new Set(found.pids ?? [])
  const latencies: number[] = []
  let timeouts = 0
  let covered = 0
  const coveredBy = new Set<string>()
  let checked = 0
  const failures: string[] = []
  const tally = new Map<string, number>()
  const contexts = new Map<string, number>()
  const labels = new Set<string>()

  for (const point of found.points ?? []) {
    const started = Date.now()
    const inspection = await inspector.inspect(point.x, point.y)
    const took = Date.now() - started
    if (!inspection) {
      timeouts += 1
      failures.push(`${point.type} @${point.x},${point.y}: inspector gave no answer in ${took} ms (click would be lost)`)
      continue
    }
    latencies.push(took)
    if (inspection.context) contexts.set(inspection.context, (contexts.get(inspection.context) ?? 0) + 1)
    // WebView2 apps (new Outlook, Teams) draw their UI in msedgewebview2.
    const own = inspection.processId === null || pids.has(inspection.processId) || webViewPids().has(inspection.processId)
    if (!own) {
      covered += 1
      coveredBy.add(processNameOf(inspection.processId))
      continue
    }

    for (const shape of SHAPES) {
      const events: CapturedClickEvent[] = []
      const service = new ClickCaptureService((event) => events.push(event), inspector, {
        ownProcessId: -1,
        readTab: () => '0123456789abcdef'
      })
      await service.handlePress(pressFor(shape, point, applicationId, inspection))
      const got = kindOf(events)
      if (events[0]?.clickTarget.startsWith('label:')) labels.add(events[0].clickTarget.slice(6))
      tally.set(`${shape}:${got}`, (tally.get(`${shape}:${got}`) ?? 0) + 1)
      const want = expected(shape, inspection, applicationId)
      checked += 1
      if (want !== null && want !== got) {
        const hit = (inspection.controlType ?? 'none').replace('ControlType.', '')
        failures.push(`${shape} on ${point.type} (hit ${hit}): expected ${want}, got ${got}`)
      }
    }
  }

  latencies.sort((a, b) => a - b)
  const median = latencies[Math.floor(latencies.length / 2)] ?? 0
  const max = latencies[latencies.length - 1] ?? 0
  console.log(
    `  ${found.points?.length ?? 0} controls found, ${covered} covered by another window, ${timeouts} inspector timeouts; lookup median ${median} ms, max ${max} ms`
  )
  if (coveredBy.size) console.log(`  answered instead by: ${[...coveredBy].join(', ')}`)
  console.log(`  recorded: ${[...tally.entries()].map(([key, count]) => `${key}×${count}`).join('  ')}`)
  if (contexts.size) console.log(`  never recorded (where they sit): ${[...contexts.entries()].map(([key, count]) => `${key}×${count}`).join('  ')}`)
  if (labels.size) console.log(`  button labels kept: ${[...labels].slice(0, 12).join(', ')}`)
  console.log(failures.length === 0 ? `  PASS (${checked} checks)` : `  ${failures.length} of ${checked} checks off:`)
  for (const failure of [...new Set(failures)].slice(0, 12)) console.log(`    - ${failure}`)
}

async function main(): Promise<void> {
  const apps = process.argv.slice(2)
  if (apps.length === 0) {
    console.log('usage: node appSurvey.cjs <processName> [...]')
    return
  }
  const inspector = new UiaClickInspector()
  // The helper's first answer is slow while PowerShell loads UI Automation.
  await inspector.inspect(0, 0)
  for (const app of apps) await surveyApp(app, inspector)
  inspector.dispose()
}

void main()
