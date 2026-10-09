import { describe, expect, it } from 'vitest'
import { isRegionScreenshotShortcut, regionFromDrag, usualRegion } from './screenshotRegions'

describe('isRegionScreenshotShortcut', () => {
  it('is Win+Shift+S on Windows, in any key order', () => {
    expect(isRegionScreenshotShortcut(['Meta', 'Shift', 'S'], false)).toBe(true)
    expect(isRegionScreenshotShortcut(['Shift', 'Meta', 'S'], false)).toBe(true)
    expect(isRegionScreenshotShortcut(['Control', 'Shift', 'S'], false)).toBe(false)
    expect(isRegionScreenshotShortcut(['Meta', 'Shift', '4'], false)).toBe(false)
  })

  it('is Cmd+Shift+4 (with or without Control) on a Mac, not full screen or the toolbar', () => {
    expect(isRegionScreenshotShortcut(['Meta', 'Shift', '4'], true)).toBe(true)
    expect(isRegionScreenshotShortcut(['Control', 'Meta', 'Shift', '4'], true)).toBe(true)
    expect(isRegionScreenshotShortcut(['Meta', 'Shift', '3'], true)).toBe(false)
    expect(isRegionScreenshotShortcut(['Meta', 'Shift', '5'], true)).toBe(false)
  })
})

describe('regionFromDrag', () => {
  it('normalizes a drag in any direction', () => {
    expect(regionFromDrag(500, 400, 100, 100)).toEqual({ x: 100, y: 100, width: 400, height: 300 })
  })

  it('ignores a click (window or full-screen snip modes)', () => {
    expect(regionFromDrag(100, 100, 103, 102)).toBeNull()
  })
})

describe('usualRegion', () => {
  const a = { x: 100, y: 100, width: 800, height: 600 }
  const aAgain = { x: 110, y: 95, width: 795, height: 610 }
  const b = { x: 0, y: 0, width: 300, height: 200 }

  it('is null before any drag', () => {
    expect(usualRegion([])).toBeNull()
  })

  it('picks the area dragged most often, as its latest drag', () => {
    expect(usualRegion([a, b, aAgain])).toEqual(aAgain)
    expect(usualRegion([a, aAgain, b])).toEqual(aAgain)
  })

  it('breaks a tie toward the most recent', () => {
    expect(usualRegion([a, b])).toEqual(b)
  })
})
