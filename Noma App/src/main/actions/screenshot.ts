import { ClipboardItem, clipboard, nativeImage } from 'electron'
import { execFile } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { isMac, isWindows } from '../platform'
import type { ScreenRegion } from '@shared/types'
import { watchScreenshotDrags, SELECTION_WINDOW_MS } from '../workflow/screenshotRegions'
import {
  BITMAPINFOHEADER_SIZE,
  BitBlt,
  CAPTUREBLT,
  CreateCompatibleBitmap,
  CreateCompatibleDC,
  DIB_RGB_COLORS,
  DeleteDC,
  DeleteObject,
  GetClipboardSequenceNumber,
  GetDC,
  GetDIBits,
  GetForegroundWindow,
  ReleaseDC,
  SRCCOPY,
  SelectObject
} from './win32'
import { sleep } from '../util'
import { processForWindow } from './windowProcess'
import { categoryOf } from '../workflow/appKnowledge'

const execFileAsync = promisify(execFile)

export interface ScreenshotResult {
  ok: boolean
  reason?: string
  /** The area the person just picked, for the caller to save on the step. */
  pickedRegion?: ScreenRegion
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

/** Gave up waiting: close the overlay (Escape) rather than leave it covering
 *  the screen, but only if it really is what's in front. */
function closeLeftOverOverlay(sendShortcut: (keys: string[]) => { ok: boolean }): void {
  if (!isWindows) return
  const front = processForWindow(GetForegroundWindow())
  if (front && categoryOf(front.processName.replace(/\.exe$/i, '').toLowerCase()) === 'capture') sendShortcut(['Escape'])
}

export type SnipOutcome = 'taken' | 'stopped' | 'timeout'

/**
 * Starts watching for a region screenshot to be taken by hand: call it just
 * before (or right as) the snipping overlay opens, then await the returned
 * function. Taken means the clipboard changed on Windows (the overlay copies
 * as the mouse is released), or a screenshot-sized drag finished on a Mac.
 * `region` is the drag that picked the area, or null when there wasn't one
 * (a window or full-screen snip picked with a click).
 */
export function watchForSnip(): (shouldStop?: () => boolean) => Promise<{ outcome: SnipOutcome; region: ScreenRegion | null }> {
  let picked: ScreenRegion | null = null
  const stopWatching = watchScreenshotDrags((drag) => (picked = drag))
  const clipboardBefore = isWindows ? (GetClipboardSequenceNumber() as number) : 0
  const taken = (): boolean => (isWindows ? GetClipboardSequenceNumber() !== clipboardBefore : picked !== null)
  return async (shouldStop = () => false) => {
    try {
      const until = Date.now() + SELECTION_WINDOW_MS
      while (!taken()) {
        if (shouldStop()) return { outcome: 'stopped', region: picked }
        if (Date.now() >= until) return { outcome: 'timeout', region: null }
        await sleep(50)
      }
      // The mouse-up and the clipboard land within a few ms of each other;
      // give the drag a moment to be reported if the clipboard won.
      if (!picked) await sleep(150)
      return { outcome: 'taken', region: picked }
    } finally {
      stopWatching()
    }
  }
}

/**
 * A region-screenshot step inside a replayed workflow.
 *
 * With `region` (the area this workflow's screenshot covers, recorded when
 * it was learned or picked on an earlier run): capture it directly, no
 * overlay, and the workflow carries straight on.
 *
 * Without one: send the shortcut so the snipping overlay opens, and wait for
 * the person to take the screenshot, instead of moving on while the overlay
 * is still up (the next step would fail behind it). The drag they made comes
 * back as `pickedRegion` for actionExecutor.ts to save on the step, so every
 * later run is automatic. `sendShortcut` and `shouldStop` come from
 * actionExecutor.ts (passed in to avoid a cycle), which also words the
 * result when the person pressed Stop.
 */
export async function runScreenshotStep(
  comboKeys: string[],
  region: ScreenRegion | undefined,
  sendShortcut: (keys: string[]) => { ok: boolean; reason?: string },
  shouldStop: () => boolean
): Promise<ScreenshotResult> {
  if (region) return captureRegion(region, comboKeys)

  const finished = watchForSnip()
  const sent = sendShortcut(comboKeys)
  if (!sent.ok) {
    void finished(() => true)
    return sent
  }
  const { outcome, region: picked } = await finished(shouldStop)
  if (outcome === 'stopped') return { ok: false }
  if (outcome === 'timeout') {
    closeLeftOverOverlay(sendShortcut)
    return { ok: false, reason: SCREENSHOT_NOT_TAKEN_REASON }
  }
  // Let the clipboard settle (and, on a Mac, the file land) before the next
  // step pastes. No drag: this run still worked, there's just no area to
  // keep, so the next run asks again.
  await sleep(300)
  return picked ? { ok: true, pickedRegion: picked } : { ok: true }
}
