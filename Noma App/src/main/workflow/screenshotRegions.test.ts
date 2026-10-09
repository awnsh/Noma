import { describe, expect, it } from 'vitest'
import type { MacroStep } from '@shared/types'
import { isRegionScreenshotShortcut, regionFromDrag, withoutScreenshotOverlaySteps } from './screenshotRegions'

const SHOT = process.platform === 'darwin' ? ['Control', 'Meta', 'Shift', '4'] : ['Meta', 'Shift', 'S']

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

  it('ignores a sliver no one means to capture (a real one was 763 x 9)', () => {
    expect(regionFromDrag(984, 933, 1747, 942)).toBeNull()
  })
})

describe('withoutScreenshotOverlaySteps', () => {
  it('drops the hand-worked snipping overlay a learned workflow recorded after the screenshot', () => {
    // A real saved workflow: the snip, switching to the overlay, the click
    // where the drag began, then the part replay actually needs.
    const recorded: MacroStep[] = [
      { type: 'shortcut', keys: SHOT },
      { type: 'delay', ms: 814 },
      { type: 'focusApplication', applicationId: 'snippingtool' },
      { type: 'delay', ms: 942 },
      { type: 'click', target: 'zone:3x2', applicationId: 'snippingtool' },
      { type: 'delay', ms: 2000 },
      { type: 'focusApplication', applicationId: 'chrome' },
      { type: 'delay', ms: 2000 },
      { type: 'shortcut', keys: ['Control', 'V'] },
      { type: 'shortcut', keys: ['Enter'] }
    ]
    expect(withoutScreenshotOverlaySteps(recorded)).toEqual([
      { type: 'shortcut', keys: SHOT },
      { type: 'focusApplication', applicationId: 'chrome' },
      { type: 'delay', ms: 2000 },
      { type: 'shortcut', keys: ['Control', 'V'] },
      { type: 'shortcut', keys: ['Enter'] }
    ])
  })

  it('keeps Snipping Tool steps that do not follow a screenshot', () => {
    const steps: MacroStep[] = [
      { type: 'focusApplication', applicationId: 'snippingtool' },
      { type: 'click', target: 'label:Save', applicationId: 'snippingtool' }
    ]
    expect(withoutScreenshotOverlaySteps(steps)).toEqual(steps)
  })
})
