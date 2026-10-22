import type { ScreenRegion } from '@shared/types'

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
