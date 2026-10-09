import { uIOhook, type UiohookMouseEvent } from 'uiohook-napi'
import type { MacroStep, ScreenRegion } from '@shared/types'
import { acquireHook, releaseHook } from './sharedHook'
import { categoryOf } from './appKnowledge'
import { isMac } from '../platform'

/**
 * Region screenshots in replayed workflows. Sending Win+Shift+S (or
 * Cmd+Shift+4) on its own only opens the snipping overlay, which then sits
 * there waiting for a drag nobody makes, and the rest of the workflow stops
 * behind it. So each workflow keeps the area it captures on its screenshot
 * step (`region`, see MacroStep), picked by the person the first time it
 * runs, and replay takes that screenshot itself (actions/screenshot.ts).
 *
 * Only the rectangle is kept: four numbers, in the same screen coordinates
 * the input hook reports. Never what was inside it.
 */

/** Smaller than this either way isn't a screenshot anyone means to take: a
 *  click, a nudge on the trackpad, or a drag that only grazed the overlay. */
const MIN_SIDE = 24
/** How long the overlay waits for the person to take the screenshot. */
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

/** The rectangle between where a drag started and ended, or null when it's
 *  too small to be a screenshot (a click, a nudge). */
export function regionFromDrag(startX: number, startY: number, endX: number, endY: number): ScreenRegion | null {
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)
  if (width < MIN_SIDE || height < MIN_SIDE) return null
  return { x: Math.min(startX, endX), y: Math.min(startY, endY), width, height }
}

/** Two drags whose every edge is this close are the same area, dragged by hand. */
const SAME_AREA_TOLERANCE = 24

function sameArea(a: ScreenRegion, b: ScreenRegion): boolean {
  return (
    Math.abs(a.x - b.x) <= SAME_AREA_TOLERANCE &&
    Math.abs(a.y - b.y) <= SAME_AREA_TOLERANCE &&
    Math.abs(a.x + a.width - (b.x + b.width)) <= SAME_AREA_TOLERANCE &&
    Math.abs(a.y + a.height - (b.y + b.height)) <= SAME_AREA_TOLERANCE
  )
}

/**
 * The area someone usually screenshots, from `regions` (oldest first): the
 * one dragged most often (within a few pixels; nobody drags exactly the
 * same box twice), ties going to the most recent, returned as its latest
 * drag so a slowly drifting habit follows the latest.
 */
export function usualRegion(regions: ScreenRegion[]): ScreenRegion | null {
  let best: ScreenRegion | null = null
  let bestCount = 0
  for (let i = regions.length - 1; i >= 0; i--) {
    const count = regions.filter((other) => sameArea(regions[i], other)).length
    if (count > bestCount) {
      best = regions[i]
      bestCount = count
    }
  }
  return best
}

/**
 * Watches the mouse while the snipping overlay is open and reports each
 * screenshot-sized drag as it finishes (the latest one is the selection;
 * plain clicks, like a trackpad's tap before tap-and-drag, are ignored).
 * Holds the shared input hook meanwhile, so it works whether or not Flow
 * learning is on. Returns the function that stops watching.
 */
export function watchScreenshotDrags(onDrag: (region: ScreenRegion) => void): () => void {
  let start: { x: number; y: number } | null = null
  const handleDown = (event: UiohookMouseEvent): void => {
    if (event.button === LEFT_BUTTON) start = { x: event.x, y: event.y }
  }
  const handleUp = (event: UiohookMouseEvent): void => {
    if (event.button !== LEFT_BUTTON || !start) return
    const region = regionFromDrag(start.x, start.y, event.x, event.y)
    start = null
    if (region) onDrag(region)
  }
  uIOhook.on('mousedown', handleDown)
  uIOhook.on('mouseup', handleUp)
  acquireHook()
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    uIOhook.off('mousedown', handleDown)
    uIOhook.off('mouseup', handleUp)
    releaseHook()
  }
}

/** Switching to the snipping overlay or clicking in it (where the drag began). */
function isScreenshotOverlayStep(step: MacroStep): boolean {
  if (step.type !== 'focusApplication' && step.type !== 'click') return false
  return categoryOf(step.applicationId ?? null) === 'capture'
}

/**
 * Drops what the person did by hand after a region-screenshot shortcut:
 * the pauses while they dragged, switching to the snipping overlay, and the
 * click where the drag began. A learned workflow records all of that, but
 * replay takes the screenshot itself (actions/screenshot.ts), so there's no
 * overlay left to switch to and the workflow would stop there. Used when a
 * workflow runs (so ones saved before this work too) and when one is saved.
 * Keeps the step objects themselves, so callers can find them in the
 * original list.
 */
export function withoutScreenshotOverlaySteps(steps: MacroStep[]): MacroStep[] {
  const kept: MacroStep[] = []
  let afterScreenshot = false
  for (const step of steps) {
    if (afterScreenshot && (step.type === 'delay' || isScreenshotOverlayStep(step))) continue
    afterScreenshot = step.type === 'shortcut' && isRegionScreenshotShortcut(step.keys)
    kept.push(step)
  }
  return kept
}
