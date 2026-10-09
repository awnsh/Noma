import { uIOhook, type UiohookMouseEvent } from 'uiohook-napi'
import { getJsonSetting, setJsonSetting } from '../database/repositories/settingsRepository'
import { acquireHook, releaseHook } from './sharedHook'
import { isMac } from '../platform'

/**
 * The area of the screen a person drags out after a region-screenshot
 * shortcut (Win+Shift+S, or Cmd+Shift+4 on a Mac). Replay needs it: sending
 * Win+Shift+S on its own only opens the snipping overlay, which then sits
 * there waiting for a drag nobody makes, and the rest of the workflow stops
 * behind it. Knowing the area, replay takes that screenshot itself
 * (actions/screenshot.ts) and carries on.
 *
 * Only the rectangle is kept: four numbers, in the same screen coordinates
 * the input hook reports. Never what was inside it.
 */
export interface ScreenRegion {
  x: number
  y: number
  width: number
  height: number
}

const SETTING_KEY = 'screenshotRegions'
/** Enough history to tell "the usual area" from a one-off. */
const MAX_REMEMBERED = 10
/** Smaller than this either way is a click, not a drag: Snipping Tool's
 *  window and full-screen modes, or pressing Escape's neighbour by mistake. */
const MIN_SIDE = 8
/** Two drags whose every edge is this close are the same area, dragged by hand. */
const SAME_AREA_TOLERANCE = 24
/** How long after the shortcut a drag still counts as its selection. */
export const SELECTION_WINDOW_MS = 30_000

const LEFT_BUTTON = 1

/** Region-screenshot shortcuts, the ones that wait for a drag. Full-screen
 *  ones (Cmd+Shift+3) and the Mac toolbar (Cmd+Shift+5) need no area. */
export function isRegionScreenshotShortcut(comboKeys: string[], mac: boolean = isMac): boolean {
  return (mac ? MAC_REGION_COMBOS : WINDOWS_REGION_COMBOS).has(comboSetKey(comboKeys))
}

function comboSetKey(keys: string[]): string {
  return [...keys].sort().join('+')
}

const WINDOWS_REGION_COMBOS = new Set([comboSetKey(['Meta', 'Shift', 'S'])])
/** Cmd+Shift+4 saves a file; with Control it goes to the clipboard. */
const MAC_REGION_COMBOS = new Set([comboSetKey(['Meta', 'Shift', '4']), comboSetKey(['Control', 'Meta', 'Shift', '4'])])

/** The rectangle between where a drag started and ended, or null for a click. */
export function regionFromDrag(startX: number, startY: number, endX: number, endY: number): ScreenRegion | null {
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)
  if (width < MIN_SIDE || height < MIN_SIDE) return null
  return { x: Math.min(startX, endX), y: Math.min(startY, endY), width, height }
}

function sameArea(a: ScreenRegion, b: ScreenRegion): boolean {
  return (
    Math.abs(a.x - b.x) <= SAME_AREA_TOLERANCE &&
    Math.abs(a.y - b.y) <= SAME_AREA_TOLERANCE &&
    Math.abs(a.x + a.width - (b.x + b.width)) <= SAME_AREA_TOLERANCE &&
    Math.abs(a.y + a.height - (b.y + b.height)) <= SAME_AREA_TOLERANCE
  )
}

/**
 * The area the person usually drags, from `history` (oldest first): the one
 * that recurs most, with ties going to the most recent. Returned as the most
 * recent drag of that area, so a slowly drifting habit follows the latest.
 */
export function usualRegion(history: ScreenRegion[]): ScreenRegion | null {
  let best: ScreenRegion | null = null
  let bestCount = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const count = history.filter((other) => sameArea(history[i], other)).length
    if (count > bestCount) {
      best = history[i]
      bestCount = count
    }
  }
  return best
}

function isRegion(value: unknown): value is ScreenRegion {
  if (typeof value !== 'object' || value === null) return false
  const { x, y, width, height } = value as Record<string, unknown>
  return [x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))
}

function loadHistory(): ScreenRegion[] {
  return getJsonSetting(SETTING_KEY, (raw) => (Array.isArray(raw) ? raw.filter(isRegion) : []), [])
}

/** The area replay should capture, or null until one has been seen. */
export function getUsualScreenshotRegion(): ScreenRegion | null {
  return usualRegion(loadHistory())
}

export function rememberScreenshotRegion(region: ScreenRegion): void {
  setJsonSetting(SETTING_KEY, [...loadHistory(), region].slice(-MAX_REMEMBERED))
}

let disarm: (() => void) | null = null

/**
 * Called right after a region-screenshot shortcut: watches for the drag
 * that follows (left button down, then up) and remembers its rectangle.
 * One drag per shortcut; gives up after SELECTION_WINDOW_MS or on a plain
 * click. Holds the shared input hook while it waits, so it also works when
 * replay sends the shortcut and Flow learning happens to be off.
 *
 * `onRegion` is told the rectangle (or null if no drag came) once it's over.
 */
export function watchForScreenshotSelection(onRegion?: (region: ScreenRegion | null) => void): void {
  disarm?.()
  let start: { x: number; y: number } | null = null

  const finish = (region: ScreenRegion | null): void => {
    cleanup()
    if (region) rememberScreenshotRegion(region)
    onRegion?.(region)
  }
  const handleDown = (event: UiohookMouseEvent): void => {
    if (event.button === LEFT_BUTTON) start = { x: event.x, y: event.y }
  }
  const handleUp = (event: UiohookMouseEvent): void => {
    if (event.button !== LEFT_BUTTON || !start) return
    finish(regionFromDrag(start.x, start.y, event.x, event.y))
  }
  const timer = setTimeout(() => finish(null), SELECTION_WINDOW_MS)
  const cleanup = (): void => {
    clearTimeout(timer)
    uIOhook.off('mousedown', handleDown)
    uIOhook.off('mouseup', handleUp)
    releaseHook()
    disarm = null
  }

  uIOhook.on('mousedown', handleDown)
  uIOhook.on('mouseup', handleUp)
  acquireHook()
  disarm = () => {
    cleanup()
    onRegion?.(null)
  }
}
