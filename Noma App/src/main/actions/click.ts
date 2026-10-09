import {
  GA_ROOT,
  GetAncestor,
  GetForegroundWindow,
  GetSystemMetrics,
  GetWindowRect,
  IsWindow,
  SendInput,
  SetCursorPos,
  WindowFromPoint,
  INPUT_MOUSE,
  INPUT_SIZE,
  MOUSEEVENTF_ABSOLUTE,
  MOUSEEVENTF_LEFTDOWN,
  MOUSEEVENTF_LEFTUP,
  MOUSEEVENTF_MOVE,
  MOUSEEVENTF_VIRTUALDESK,
  SM_CXVIRTUALSCREEN,
  SM_CYVIRTUALSCREEN,
  SM_XVIRTUALSCREEN,
  SM_YVIRTUALSCREEN
} from './win32'
import { ZONE_COLUMNS, ZONE_ROWS, MIN_WINDOW_SIZE, type ScreenRect } from '../workflow/clickTarget'
import { markSelfInjectedClick } from '../workflow/selfInjectedClicks'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import { processForWindow, sameProcess } from './windowProcess'
import { CANCEL_POLL_MS, uiaControlFinder } from './uiaControlFinder'
import { ACTION_CANCELLED_REASON, isCancelRequested, type ExecutionResult } from './actionExecutor'
import {
  CG_LEFT_MOUSE_DOWN,
  CG_LEFT_MOUSE_UP,
  CG_MOUSE_MOVED,
  elementAtPoint,
  focusedWindowRect,
  frontmostPid,
  frontWindowOwnerPid,
  postMouseEvent
} from './macos'
import { isMac } from '../platform'
import { sleep } from '../util'
import { APPROACH_STEP_MS, FIND_RETRY_MS, FIND_WAIT_MS, HOVER_MS, PRESS_MS } from './timings'

/** A window minimized (or otherwise off-screen) reports coordinates around
 *  -32000 on Windows; nowhere close to a real, clickable position. */
const OFFSCREEN_COORD_THRESHOLD = -30000

/**
 * Real click replay for a learned workflow's `click` MacroStep.
 *
 * Every click is checked before it happens, and refuses (the macro stops
 * there, with the reason shown) rather than click somewhere it can't vouch
 * for. A click can trigger something irreversible, so a missed step is
 * always the better failure than a misdirected one.
 *
 * 1. **The right app is in front.** When the step knows which application
 *    it was recorded in (`applicationId`), the foreground window must
 *    belong to that app's process. Otherwise, e.g. if a focus step before
 *    it lost a race with a notification, the click would land in whatever
 *    happened to be on top.
 * 2. **`label:<name>`: the same control, found again.** The named button
 *    or menu item is looked up afresh by UI Automation in that app's
 *    windows (uiaControlFinder.ts), so it's found wherever it is *now*:
 *    after a window resize, a moved toolbar or a different screen. It must
 *    be exactly one enabled, visible control with that name; none (after
 *    waiting FIND_WAIT_MS for it to appear) or several both refuse. The
 *    found point must also belong to the app's own window, so a popup
 *    covering the button can't receive the click instead. The wait (and a
 *    search in progress) checks for Stop every CANCEL_POLL_MS, so pressing
 *    Stop ends the step at once instead of after the whole wait.
 * 3. **`zone:<col>x<row>`: a position.** Only recorded where the app
 *    exposes no named controls (custom-drawn UIs). Mapped onto the
 *    foreground window's *current* bounds, so a moved or resized window
 *    still gets the same relative spot. This one is approximate by design:
 *    Noma never records exact pixels (see clickTarget.ts).
 */
export async function executeClick(target: string, applicationId?: string): Promise<ExecutionResult> {
  // On macOS the "handle" is the frontmost app's pid (see macAdapter.ts).
  const hwnd = isMac ? (frontmostPid() ?? frontWindowOwnerPid() ?? 0) : GetForegroundWindow()
  const owner = processForWindow(hwnd)

  if (applicationId) {
    const application = getApplicationById(applicationId)
    if (!application) return { ok: false, reason: 'The app this click was recorded in is no longer known to Noma' }
    if (!owner || !sameProcess(owner.processName, application.processName)) {
      return {
        ok: false,
        reason: `Expected ${application.name} to be in front, but ${owner?.processName || 'another window'} was. Nothing was clicked`
      }
    }
  }

  if (target.startsWith('label:')) return clickNamedControl(target.slice('label:'.length), owner?.pid ?? null)

  const match = /^zone:(\d+)x(\d+)$/.exec(target)
  if (!match) return { ok: false, reason: 'Unrecognized click target' }
  const col = Number(match[1])
  const row = Number(match[2])
  if (col < 0 || col >= ZONE_COLUMNS || row < 0 || row >= ZONE_ROWS) {
    return { ok: false, reason: 'Click target is outside the recorded grid' }
  }

  const rect = windowRect(hwnd)
  if (!rect) {
    return { ok: false, reason: 'Could not find the focused window on screen right now (it may be minimized)' }
  }
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  const x = rect.left + Math.round(((col + 0.5) / ZONE_COLUMNS) * width)
  const y = rect.top + Math.round(((row + 0.5) / ZONE_ROWS) * height)
  return sendClick(x, y)
}

async function clickNamedControl(label: string, processId: number | null): Promise<ExecutionResult> {
  if (processId === null) return { ok: false, reason: `Could not tell which app is in front to look for “${label}”` }

  const deadline = Date.now() + FIND_WAIT_MS
  for (;;) {
    const found = await uiaControlFinder.find(processId, label, isCancelRequested)
    // Also after a search that did answer: Stop pressed meanwhile means no click.
    if (found.status === 'cancelled' || isCancelRequested()) return { ok: false, reason: ACTION_CANCELLED_REASON }
    if (found.status === 'found') {
      if (ownerPidAt(found.x, found.y) !== processId) {
        return { ok: false, reason: `Something is covering “${label}”. Nothing was clicked` }
      }
      return await sendClick(found.x, found.y)
    }
    if (found.status === 'several') {
      return { ok: false, reason: `Found ${found.count} buttons named “${label}” and couldn't tell which one. Nothing was clicked` }
    }
    if (found.status === 'unavailable') {
      return { ok: false, reason: `Couldn't search the app for “${label}” (${isMac ? 'macOS Accessibility' : 'Windows UI Automation'} didn't answer)` }
    }
    if (Date.now() >= deadline) {
      return { ok: false, reason: `Couldn't find “${label}” in the app. It may be hidden, disabled or renamed` }
    }
    if (!(await waitUnlessCancelled(FIND_RETRY_MS))) return { ok: false, reason: ACTION_CANCELLED_REASON }
  }
}

/** sleep, checking for Stop every CANCEL_POLL_MS; false once it's pressed. */
async function waitUnlessCancelled(ms: number): Promise<boolean> {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (isCancelRequested()) return false
    await sleep(Math.min(CANCEL_POLL_MS, until - Date.now()))
  }
  return !isCancelRequested()
}

/** Mouse path onto the target before pressing: a few steps in from *  below-left of it, like a hand arriving. */
const APPROACH_OFFSETS: Array<[number, number]> = [
  [-12, 10],
  [-8, 6],
  [-4, 3],
  [0, 0]
]

/**
 * Clicks the way a hand does: moves onto the target, pauses, presses,
 * releases. Not "put the cursor there and click".
 *
 * Apps built on newer Windows UI frameworks (new Notepad, Settings,
 * Terminal; WinUI 3 / XAML) only treat a press as a click on a control once
 * the pointer has actually *moved* over that control. A cursor teleported
 * with SetCursorPos and pressed at once was hit-or-miss there: replaying
 * "Edit -> Select all" in Notepad opened the Edit menu only some of the
 * time, so the next step found no "Select all" and the macro stopped (in a
 * test: 2 of 3 opened that way, 3 of 3 with real movement first). The moves
 * are absolute (exact pixels, unaffected by pointer acceleration), and a
 * final SetCursorPos pins the exact spot.
 */
async function sendClick(x: number, y: number): Promise<ExecutionResult> {
  if (isMac) return sendMacClick(x, y)
  for (const [dx, dy] of APPROACH_OFFSETS) {
    SendInput(1, [absoluteMove(x + dx, y + dy)], INPUT_SIZE)
    await sleep(APPROACH_STEP_MS)
  }
  SetCursorPos(x, y)
  await sleep(HOVER_MS)
  // Right before the press, which is what the capture hook reacts to.
  markSelfInjectedClick()
  const down: number = SendInput(1, [mouseEvent(MOUSEEVENTF_LEFTDOWN)], INPUT_SIZE)
  await sleep(PRESS_MS)
  const up: number = SendInput(1, [mouseEvent(MOUSEEVENTF_LEFTUP)], INPUT_SIZE)
  return down === 1 && up === 1 ? { ok: true } : { ok: false, reason: 'The OS refused the synthetic click' }
}


/** An absolute move to screen pixel (x, y), across all monitors. */
function absoluteMove(x: number, y: number): ReturnType<typeof mouseEvent> {
  const left = GetSystemMetrics(SM_XVIRTUALSCREEN)
  const top = GetSystemMetrics(SM_YVIRTUALSCREEN)
  const width = Math.max(2, GetSystemMetrics(SM_CXVIRTUALSCREEN))
  const height = Math.max(2, GetSystemMetrics(SM_CYVIRTUALSCREEN))
  const nx = Math.round(((x - left) * 65535) / (width - 1))
  const ny = Math.round(((y - top) * 65535) / (height - 1))
  return mouseEvent(MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK, nx, ny)
}

/** The process whose window is at a screen point (something else could be
 *  covering the control that was found). */
function ownerPidAt(x: number, y: number): number | null {
  if (isMac) return elementAtPoint(x, y)?.pid ?? null
  return processForWindow(GetAncestor(WindowFromPoint({ x, y }), GA_ROOT))?.pid ?? null
}

/** The same hand-like move, pause, press and release as sendClick, posted as
 *  CoreGraphics events. Needs Accessibility permission. */
async function sendMacClick(x: number, y: number): Promise<ExecutionResult> {
  for (const [dx, dy] of APPROACH_OFFSETS) {
    postMouseEvent(CG_MOUSE_MOVED, x + dx, y + dy)
    await sleep(APPROACH_STEP_MS)
  }
  await sleep(HOVER_MS)
  markSelfInjectedClick()
  const down = postMouseEvent(CG_LEFT_MOUSE_DOWN, x, y)
  await sleep(PRESS_MS)
  const up = postMouseEvent(CG_LEFT_MOUSE_UP, x, y)
  return down && up ? { ok: true } : { ok: false, reason: 'macOS refused the synthetic click (is Accessibility allowed for Noma?)' }
}

function windowRect(hwnd: number): ScreenRect | null {
  const rect: ScreenRect = { left: 0, top: 0, right: 0, bottom: 0 }
  if (isMac) {
    const frame = focusedWindowRect(hwnd)
    if (!frame) return null
    Object.assign(rect, frame)
  } else {
    if (!IsWindow(hwnd)) return null
    if (!GetWindowRect(hwnd, rect)) return null
  }
  if (rect.left <= OFFSCREEN_COORD_THRESHOLD || rect.top <= OFFSCREEN_COORD_THRESHOLD) return null

  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  if (width < MIN_WINDOW_SIZE || height < MIN_WINDOW_SIZE) return null
  return rect
}

function mouseEvent(
  flags: number,
  dx = 0,
  dy = 0
): {
  type: number
  u: { mi: { dx: number; dy: number; mouseData: number; dwFlags: number; time: number; dwExtraInfo: number } }
} {
  return { type: INPUT_MOUSE, u: { mi: { dx, dy, mouseData: 0, dwFlags: flags, time: 0, dwExtraInfo: 0 } } }
}
