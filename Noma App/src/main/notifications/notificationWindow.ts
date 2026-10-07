import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@shared/constants'
import type { WorkflowNotice } from '@shared/types'
import { platformIcon } from '../platformIcon'

/**
 * Noma Notice's own window: a small, frameless, transparent surface that
 * floats in the bottom-right corner over whatever the user is actually doing.
 *
 * It is a second window rather than a panel inside the main one because the
 * whole premise is that Noma is *not* on screen: the main window is
 * minimized, behind something, or on another monitor. Forcing it forward to
 * say "I noticed something" would be exactly the interruption this feature
 * is supposed to avoid.
 *
 * It loads the same renderer bundle with `?surface=notice` (see
 * renderer/src/main.tsx), so the notice is built from the app's own
 * components, fonts and tokens rather than a parallel mini design system,
 * and needs no second Vite entry point or build-config change.
 *
 * Three properties matter more than anything visual here:
 *
 * - `focusable: false`: the user is typing in another application. A
 *   notification that takes keyboard focus doesn't annoy, it swallows
 *   keystrokes and can fire the wrong shortcut in whatever had focus. On
 *   Windows this maps to WS_EX_NOACTIVATE: the window still receives clicks,
 *   it never activates.
 * - `setIgnoreMouseEvents(true, { forward: true })`; by default every click
 *   passes straight through to the application underneath, so the notice
 *   can't block a button it happens to be sitting on. `forward: true` still
 *   delivers *move* events to the renderer, which is how it knows the
 *   pointer is over the card and asks (via setInteractive) to take clicks
 *   for as long as it is.
 * - `transparent: true`: the card is smaller than the window, leaving room
 *   for its shadow and its enter animation to happen outside its own edges.
 *
 * On the glass: a transparent Electron window composites its semi-opaque
 * pixels directly over the desktop, so the card is genuinely translucent
 * but `backdrop-filter` inside it has no desktop content to sample and so
 * cannot frost what is behind it. Real frosting would mean Windows 11's
 * `backgroundMaterial: 'acrylic'`, which applies to the whole window
 * rectangle and therefore rules out the transparent margin above. Tint,
 * border and shadow carry the material instead; see the renderer's
 * NOTICE_GLASS for the other half of this.
 */

/** Big enough for the expanded review state, with room around the card for
 *  its shadow and the 12px it travels on entry. The card itself is smaller
 *  still (300px wide) and sits in this window's bottom-right: see
 *  WorkflowNotice. */
const NOTICE_WIDTH = 340
// Taller than the card needs, because the window is transparent and
// click-through: the slack costs nothing, and the expanded review state plus
// a long explanation has to fit without ever being clipped by the window
// edge. It grows upward from the corner, so the card doesn't move.
const NOTICE_HEIGHT = 330
/** Gap from the edges of the work area; so the notice clears the taskbar,
 *  and sits where Windows' own notifications do rather than in the middle of
 *  what the user is looking at. */
const EDGE_MARGIN = 20

let noticeWindow: BrowserWindow | null = null
/** What the notice window should be showing. Held here as well as pushed,
 *  because the push can win the race against React mounting in a freshly
 *  created window: the surface asks for this on mount and the two agree. */
let currentNotice: WorkflowNotice | null = null

function positionInCorner(window: BrowserWindow): void {
  // The *work* area, not the full display bounds, so the notice sits above
  // the taskbar rather than under it.
  const { workArea } = screen.getPrimaryDisplay()
  window.setBounds({
    x: Math.round(workArea.x + workArea.width - NOTICE_WIDTH - EDGE_MARGIN),
    y: Math.round(workArea.y + workArea.height - NOTICE_HEIGHT - EDGE_MARGIN),
    width: NOTICE_WIDTH,
    height: NOTICE_HEIGHT
  })
}

function createNoticeWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: NOTICE_WIDTH,
    height: NOTICE_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    // Its own icon, so nothing that lists windows (Alt+Tab, Task View) falls
    // back to Electron's.
    icon: platformIcon(),
    // The card draws its own shadow in CSS; an OS shadow would frame the
    // transparent window rectangle, not the card inside it.
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Same hardening as the main window: see docs/security-review.md.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The notice's auto-dismiss timer runs in a window that is, by
      // definition, never focused. Without this Chromium would throttle it
      // and the notice would linger long past its six seconds.
      backgroundThrottling: false
    }
  })

  // 'screen-saver' is the level that stays above full-screen applications,
  // which is where a notice is most needed and most easily lost.
  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  window.setIgnoreMouseEvents(true, { forward: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?surface=notice`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { search: 'surface=notice' })
  }

  window.on('closed', () => {
    noticeWindow = null
  })
  return window
}

/** The notice's window, if one exists (the website capture, captureNotice.ts). */
export function getWorkflowNoticeWindow(): BrowserWindow | null {
  return noticeWindow
}

/** Shows (creating on first use) the notice for one workflow. */
export function showWorkflowNotice(notice: WorkflowNotice): void {
  currentNotice = notice
  noticeWindow ??= createNoticeWindow()
  const window = noticeWindow

  // Placed and shown straight away, never behind the load. The window is
  // transparent, so an empty one is invisible; but a window that is only
  // positioned once its renderer is ready sits at Electron's default centred
  // bounds until then, which on the very first notice of a session is long
  // enough to matter. Separating the two also means the corner placement
  // can't be skipped by a slow or failed load.
  positionInCorner(window)
  // showInactive, never show: showing normally would raise *and focus* the
  // window, which is the one thing this surface must never do.
  window.showInactive()

  // The content, on the other hand, does have to wait; and if it misses the
  // push anyway (React still mounting), the surface asks for `currentNotice`
  // itself on mount, so the two paths cover each other.
  const send = (): void => window.webContents.send(IPC_CHANNELS.WORKFLOW_NOTICE_SHOWN, notice)
  if (window.webContents.isLoading()) window.webContents.once('did-finish-load', send)
  else send()
}

/** Hides the notice and returns the window to click-through. */
export function getPendingWorkflowNotice(): WorkflowNotice | null {
  return currentNotice
}

export function hideWorkflowNotice(): void {
  currentNotice = null
  if (!noticeWindow) return
  noticeWindow.setIgnoreMouseEvents(true, { forward: true })
  noticeWindow.hide()
}

/**
 * While the pointer is over the card the window takes clicks; the moment it
 * leaves, everything passes through to the application underneath again.
 */
export function setWorkflowNoticeInteractive(interactive: boolean): void {
  if (!noticeWindow || noticeWindow.isDestroyed()) return
  noticeWindow.setIgnoreMouseEvents(!interactive, { forward: true })
}

export function closeWorkflowNoticeWindow(): void {
  noticeWindow?.destroy()
  noticeWindow = null
  currentNotice = null
}

/** Testing seam only; lets a test observe what the window layer was asked
 *  to do without an Electron display. */
export function isWorkflowNoticeOpen(): boolean {
  return noticeWindow !== null && !noticeWindow.isDestroyed() && noticeWindow.isVisible()
}
