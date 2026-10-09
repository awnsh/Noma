import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@shared/constants'
import type { GlideToast } from '@shared/types'
import { platformIcon } from '../platformIcon'

/**
 * Glide's toast: a tiny pill in the bottom-left corner that names what a
 * swipe just ran, so a swipe made while looking at another app gets an
 * answer without Noma coming forward.
 *
 * Built the same way as Noma Notice (notificationWindow.ts), and for the
 * same reasons: its own frameless, transparent, never-focusable window,
 * shown with showInactive, loading the shared renderer bundle with
 * `?surface=glide-toast`. Unlike the notice it has nothing to click, so it
 * ignores the mouse completely, always. Bottom-left on purpose: the notice
 * owns bottom-right, and the two can be on screen at once.
 */

const TOAST_WIDTH = 300
/** The pill is ~40px; the rest is room for its shadow and entry travel. */
const TOAST_HEIGHT = 76
const EDGE_MARGIN = 20
/** How long one toast stays. Matches the renderer's animation
 *  (GLIDE_TOAST_MS in GlideToastSurface), which fades it out at the end. */
export const GLIDE_TOAST_MS = 1800

let toastWindow: BrowserWindow | null = null
let currentToast: GlideToast | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function positionInCorner(window: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay()
  window.setBounds({
    x: Math.round(workArea.x + EDGE_MARGIN),
    y: Math.round(workArea.y + workArea.height - TOAST_HEIGHT - EDGE_MARGIN),
    width: TOAST_WIDTH,
    height: TOAST_HEIGHT
  })
}

function createToastWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: TOAST_WIDTH,
    height: TOAST_HEIGHT,
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
    icon: platformIcon(),
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Never focused, so Chromium would otherwise throttle its animation.
      backgroundThrottling: false
    }
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  window.setIgnoreMouseEvents(true)
  // Left out of every screenshot: a swipe that runs a screenshot workflow
  // shows this toast at the very moment Noma captures the screen
  // (actions/screenshot.ts), and it would land in the picture. Checked live:
  // a protected window doesn't appear in Noma's own capture.
  window.setContentProtection(true)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?surface=glide-toast`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { search: 'surface=glide-toast' })
  }

  window.on('closed', () => {
    toastWindow = null
  })
  return window
}

/** Shows (creating on first use) the toast, replacing any still on screen. */
export function showGlideToast(toast: GlideToast): void {
  currentToast = toast
  toastWindow ??= createToastWindow()
  const window = toastWindow

  positionInCorner(window)
  window.showInactive()

  // Same race as the notice: the first push can beat React mounting, so the
  // surface also asks for `currentToast` on mount.
  const send = (): void => window.webContents.send(IPC_CHANNELS.GLIDE_TOAST_SHOWN, toast)
  if (window.webContents.isLoading()) window.webContents.once('did-finish-load', send)
  else send()

  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    hideTimer = null
    currentToast = null
    if (toastWindow && !toastWindow.isDestroyed()) toastWindow.hide()
  }, GLIDE_TOAST_MS)
}

/**
 * Creates the (hidden) window ahead of the first swipe. A cold window takes
 * longer to load than a toast stays up, so without this the first swipe of
 * a session would show nothing. Called whenever Glide is on.
 */
export function prepareGlideToastWindow(): void {
  toastWindow ??= createToastWindow()
}

export function getPendingGlideToast(): GlideToast | null {
  return currentToast
}

export function closeGlideToastWindow(): void {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
  toastWindow?.destroy()
  toastWindow = null
  currentToast = null
}
