import { uIOhook, type UiohookMouseEvent } from 'uiohook-napi'
import { acquireHook, releaseHook } from './sharedHook'
import { SELECT_TARGET, TAB_TARGET_PREFIX, clickTargetFor, isHighlightPress, type ScreenRect } from './clickTarget'
import { categoryOf, isClickCaptureExcluded } from './appKnowledge'
import { isSelfInjectedClick } from './selfInjectedClicks'
import { noteHighlight, noteOtherKey } from './selection'
import type { ClickInspection, ClickInspector } from './uiaInspector'
import { isMac } from '../platform'

export interface CapturedClickEvent {
  applicationId: string | null
  /** `label:<name>`, `zone:<col>x<row>`, `select` or `tab:<fingerprint>`:
   *  see clickTarget.ts. */
  clickTarget: string
  timestamp: number
}

/** One left-button press, from the button going down to it coming up. */
export interface Press {
  x: number
  y: number
  /** Where the button came up; the same point when it wasn't dragged. */
  upX?: number
  upY?: number
  applicationId: string | null
  timestamp: number
  /** Shift, or Ctrl (Command on a Mac), was held: extending a selection. */
  extending?: boolean
  /** The second or third press of a double/triple click. */
  repeatPress?: boolean
  /** The window in front moved or changed size during the press: it was
   *  being dragged by its title bar or edge, not anything inside it. */
  windowMoved?: boolean
  /** The inspection started when the button went down (the control is
   *  looked up as it was then, before a menu closes on release). */
  inspection?: Promise<ClickInspection | null>
}

export interface ClickCaptureOptions {
  /** The scrambled fingerprint of the browser tab in front, or null
   *  (tabFingerprint.ts). */
  readTab?: () => string | null
  /** Bounds of the window in front, to tell a window drag from a drag
   *  inside it. */
  readWindowRect?: () => ScreenRect | null
  ownProcessId?: number
}

const LEFT_BUTTON = 1
/** Further than this between press and release is a drag, not a click. */
export const DRAG_MIN_PX = 8
/** Two presses this close in time and space are a double-click. */
const DOUBLE_CLICK_MS = 500
const DOUBLE_CLICK_PX = 6
/** How long a clicked tab gets to show in the window title. */
const TAB_SETTLE_MS = 250

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function sameRect(a: ScreenRect | null, b: ScreenRect | null): boolean {
  if (!a || !b) return true
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom
}

/**
 * The click counterpart of CaptureService: owns the (shared, ref-counted)
 * global mouse hook while click capture is enabled, asks the inspector what
 * control was hit, and reports ONLY the sanitized target (clickTarget.ts).
 * Coordinates and raw control names are used transiently to compute that
 * target and are never stored or emitted.
 *
 * A press is judged as a whole, button down to button up, so Flow can tell
 * what it was for:
 *  - a drag across text, items or a canvas, a double-click on text, a
 *    Shift/Ctrl+click, or picking an item in a list is a HIGHLIGHT (`select`):
 *    the step "highlighted something", never what or where;
 *  - in a browser, clicking a tab is going to that tab (`tab:` + the
 *    scrambled tab fingerprint), and only named buttons count otherwise;
 *  - anything else is a click on a named control (`label:`) or, in apps with
 *    no named controls, a coarse spot (`zone:`).
 * A window being dragged or resized records nothing.
 *
 * Only left-button presses count (right-click/middle-click are context and
 * navigation, not command steps). Clicks landing in Flow's own window are
 * dropped. The application is read at the moment of the press, not after the
 * (async) inspection, so a click that switches windows is still attributed to
 * the app it happened in.
 */
export class ClickCaptureService {
  private isRunning = false
  private currentApplicationId: string | null = null
  private readonly ownProcessId: number
  private readonly readTab: () => string | null
  private readonly readWindowRect: () => ScreenRect | null
  /** The press whose button is still down, or null when ignored. */
  private pending: (Press & { rect: ScreenRect | null }) | null = null
  private lastDown: { x: number; y: number; at: number } | null = null

  constructor(
    private readonly onClick: (event: CapturedClickEvent) => void,
    private readonly inspector: ClickInspector,
    options: ClickCaptureOptions = {}
  ) {
    this.ownProcessId = options.ownProcessId ?? process.pid
    this.readTab = options.readTab ?? (() => null)
    this.readWindowRect = options.readWindowRect ?? (() => null)
  }

  setCurrentApplicationId(applicationId: string | null): void {
    this.currentApplicationId = applicationId
  }

  start(): void {
    if (this.isRunning) return
    uIOhook.on('mousedown', this.handleMouseDown)
    uIOhook.on('mouseup', this.handleMouseUp)
    acquireHook()
    this.isRunning = true
  }

  stop(): void {
    if (!this.isRunning) return
    releaseHook()
    uIOhook.off('mousedown', this.handleMouseDown)
    uIOhook.off('mouseup', this.handleMouseUp)
    this.inspector.dispose()
    this.pending = null
    this.isRunning = false
  }

  get running(): boolean {
    return this.isRunning
  }

  /** Exposed for tests: the whole pipeline for one press. */
  async handlePress(press: Press): Promise<void> {
    const { applicationId, x, y, timestamp } = press
    // No known application (nothing focused / Flow itself) -> nothing to attribute a click to.
    if (!applicationId || press.windowMoved) return

    const inspection = await (press.inspection ?? this.inspector.inspect(x, y))
    if (!inspection) return
    if (inspection.processId === this.ownProcessId) return

    const dragged = Math.hypot((press.upX ?? x) - x, (press.upY ?? y) - y) >= DRAG_MIN_PX
    const shape = { dragged, repeatPress: !!press.repeatPress, extending: !!press.extending }
    if (isHighlightPress(inspection.controlType, shape)) {
      // Carries nothing, so it's noticed in every app, even the ones whose
      // buttons are never recorded.
      noteHighlight(applicationId, timestamp)
      this.onClick({ applicationId, clickTarget: SELECT_TARGET, timestamp })
      return
    }
    // A drag that isn't a highlight moved a slider, a scrollbar or a tab;
    // the second press of a double-click was already counted by the first.
    if (dragged || press.repeatPress) return
    // Browsers, chat and meeting apps put people's names and page content in
    // their buttons: see isClickCaptureExcluded.
    if (isClickCaptureExcluded(applicationId)) return

    const browser = categoryOf(applicationId) === 'browser'
    if (browser && inspection.controlType === 'ControlType.TabItem') {
      // The tab's name is the page's title: only its scrambled fingerprint
      // is kept, read once the browser has switched to it.
      await sleep(TAB_SETTLE_MS)
      const tab = this.readTab()
      if (tab) this.onClick({ applicationId, clickTarget: `${TAB_TARGET_PREFIX}${tab}`, timestamp })
      return
    }

    const clickTarget = clickTargetFor(x, y, inspection, !browser)
    if (!clickTarget) return
    this.onClick({ applicationId, clickTarget, timestamp })
  }

  private readonly handleMouseDown = (event: UiohookMouseEvent): void => {
    if (event.button !== LEFT_BUTTON) return
    // A press that didn't come up (a missed release) still counts as a click.
    if (this.pending) this.finish(this.pending.x, this.pending.y)
    // Any press ends the chance for a following Delete to mean "delete the
    // highlight" (it may have deselected); a press that IS a highlight sets
    // it again once it's been judged.
    noteOtherKey()
    // A control/macro's own click step fires through this exact hook too
    // see selfInjectedClicks.ts. Checked first, before the (async) UIA
    // inspection, so Flow's own replayed click is never even looked at.
    if (isSelfInjectedClick()) {
      this.pending = null
      return
    }

    const now = Date.now()
    const repeatPress =
      !!this.lastDown &&
      now - this.lastDown.at <= DOUBLE_CLICK_MS &&
      Math.hypot(event.x - this.lastDown.x, event.y - this.lastDown.y) <= DOUBLE_CLICK_PX
    this.lastDown = { x: event.x, y: event.y, at: now }

    const applicationId = this.currentApplicationId
    this.pending = {
      x: event.x,
      y: event.y,
      applicationId,
      timestamp: now,
      extending: event.shiftKey || (isMac ? event.metaKey : event.ctrlKey),
      repeatPress,
      rect: this.safeWindowRect(),
      inspection: applicationId ? this.inspector.inspect(event.x, event.y) : Promise.resolve(null)
    }
  }

  private readonly handleMouseUp = (event: UiohookMouseEvent): void => {
    if (event.button !== LEFT_BUTTON || !this.pending) return
    this.finish(event.x, event.y)
  }

  private finish(upX: number, upY: number): void {
    const press = this.pending
    this.pending = null
    if (!press) return
    const windowMoved = !sameRect(press.rect, this.safeWindowRect())
    void this.handlePress({ ...press, upX, upY, windowMoved })
  }

  private safeWindowRect(): ScreenRect | null {
    try {
      return this.readWindowRect()
    } catch {
      return null
    }
  }
}
