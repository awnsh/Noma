import { ClipboardItem, clipboard, nativeImage } from 'electron'
import { execFile } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { isMac, isWindows } from '../platform'
import {
  getUsualScreenshotRegion,
  watchForScreenshotSelection,
  SELECTION_WINDOW_MS,
  type ScreenRegion
} from '../workflow/screenshotRegions'
import {
  BITMAPINFOHEADER_SIZE,
  BitBlt,
  CAPTUREBLT,
  CreateCompatibleBitmap,
  CreateCompatibleDC,
  DIB_RGB_COLORS,
  DeleteDC,
  DeleteObject,
  GetDC,
  GetDIBits,
  ReleaseDC,
  SRCCOPY,
  SelectObject
} from './win32'
import { sleep } from '../util'

const execFileAsync = promisify(execFile)

export interface ScreenshotResult {
  ok: boolean
  reason?: string
}

/** Shown when the overlay was left open with nothing selected. */
export const SCREENSHOT_NOT_TAKEN_REASON = 'The screenshot was never taken, so there was nothing to paste'

/** Copies `region` of the screen into a PNG-ready image (Windows, GDI). */
function captureRegionWindows(region: ScreenRegion): Electron.NativeImage | null {
  const { x, y, width, height } = region
  const screenDc = GetDC(0)
  if (!screenDc) return null
  const memoryDc = CreateCompatibleDC(screenDc)
  const bitmap = CreateCompatibleBitmap(screenDc, width, height)
  const previous = SelectObject(memoryDc, bitmap)
  try {
    if (!BitBlt(memoryDc, 0, 0, width, height, screenDc, x, y, SRCCOPY | CAPTUREBLT)) return null
    // 32-bit top-down BGRA (a negative height means top row first).
    const info = Buffer.alloc(BITMAPINFOHEADER_SIZE + 16)
    info.writeUInt32LE(BITMAPINFOHEADER_SIZE, 0)
    info.writeInt32LE(width, 4)
    info.writeInt32LE(-height, 8)
    info.writeUInt16LE(1, 12)
    info.writeUInt16LE(32, 14)
    const pixels = Buffer.alloc(width * height * 4)
    SelectObject(memoryDc, previous)
    if (GetDIBits(memoryDc, bitmap, 0, height, pixels, info, DIB_RGB_COLORS) !== height) return null
    // GDI leaves the alpha byte at 0, which would paste as fully transparent.
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255
    return nativeImage.createFromBitmap(pixels, { width, height })
  } finally {
    SelectObject(memoryDc, previous)
    DeleteObject(bitmap)
    DeleteDC(memoryDc)
    ReleaseDC(0, screenDc)
  }
}

/** Where Cmd+Shift+4 saves on this Mac (the user can change it). */
async function macScreenshotFolder(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('defaults', ['read', 'com.apple.screencapture', 'location'])
    const folder = stdout.trim()
    if (folder) return folder.replace(/^~(?=\/|$)/, homedir())
  } catch {
    // Not set: macOS's own default.
  }
  return join(homedir(), 'Desktop')
}

function macScreenshotName(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `Screenshot ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} at ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}.png`
}

/**
 * Takes the screenshot a region-screenshot shortcut would have, of `region`,
 * without any overlay: to the clipboard on Windows (as Win+Shift+S does) and
 * on a Mac with Control held; otherwise to a file where the Mac saves its
 * own screenshots.
 */
export async function captureRegion(region: ScreenRegion, comboKeys: string[]): Promise<ScreenshotResult> {
  const rounded = {
    x: Math.round(region.x),
    y: Math.round(region.y),
    width: Math.max(1, Math.round(region.width)),
    height: Math.max(1, Math.round(region.height))
  }
  try {
    if (isWindows) {
      const image = captureRegionWindows(rounded)
      if (!image || image.isEmpty()) return { ok: false, reason: 'Could not capture that part of the screen' }
      // As a PNG bitmap, the same thing Snipping Tool puts there for a paste.
      await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(image.toPNG())], { type: 'image/png' }) })])
      return { ok: true }
    }
    if (isMac) {
      // -x: no shutter sound. Points, top-left origin: the same space uiohook reports.
      const area = `${rounded.x},${rounded.y},${rounded.width},${rounded.height}`
      const args = comboKeys.includes('Control')
        ? ['-x', '-c', '-R', area]
        : ['-x', '-R', area, join(await macScreenshotFolder(), macScreenshotName())]
      await execFileAsync('screencapture', args)
      return { ok: true }
    }
    return { ok: false, reason: 'Screenshots are not supported on this system' }
  } catch {
    return { ok: false, reason: 'Could not capture that part of the screen' }
  }
}

/**
 * A region-screenshot step inside a replayed workflow.
 *
 * Known area (the person has dragged one since this existed): capture it
 * directly, no overlay, and the workflow carries straight on.
 *
 * Not known yet: send the shortcut as before, but instead of moving on while
 * the overlay is still up (the next step then fails, and the workflow stops
 * there), wait for the person to drag the area once. That drag is
 * remembered, so every later run is automatic. `sendShortcut` and
 * `shouldStop` come from actionExecutor.ts (passed in to avoid a cycle),
 * which also words the result when the person pressed Stop.
 */
export async function runScreenshotStep(
  comboKeys: string[],
  sendShortcut: (keys: string[]) => { ok: boolean; reason?: string },
  shouldStop: () => boolean
): Promise<ScreenshotResult> {
  const known = getUsualScreenshotRegion()
  if (known) return captureRegion(known, comboKeys)

  let selection: ScreenRegion | null | undefined
  watchForScreenshotSelection((region) => (selection = region))
  const sent = sendShortcut(comboKeys)
  if (!sent.ok) return sent

  const until = Date.now() + SELECTION_WINDOW_MS
  while (selection === undefined && Date.now() < until) {
    if (shouldStop()) return { ok: false }
    await sleep(50)
  }
  if (!selection) return { ok: false, reason: SCREENSHOT_NOT_TAKEN_REASON }
  // The overlay copies the area to the clipboard as the mouse is released;
  // give it a moment before the next step pastes.
  await sleep(400)
  return { ok: true }
}
