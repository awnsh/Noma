import { describe, expect, it } from 'vitest'
import { isMac } from '../platform'
import { buildWorkflowMacroSteps } from './macroSteps'

/** This platform's region screenshot: Win+Shift+S, or Ctrl+Cmd+Shift+4 on a Mac. */
const SHOT = isMac ? ['Control', 'Meta', 'Shift', '4'] : ['Meta', 'Shift', 'S']
/** This OS's paste: a workflow ending in one gets an Enter appended. */
const PASTE = isMac ? ['Meta', 'V'] : ['Control', 'V']

describe('buildWorkflowMacroSteps; tabs and screenshot areas', () => {
  it('carries the tab and area onto the macro, and drops the hand-worked overlay', () => {
    const area = { x: 10, y: 20, width: 300, height: 200 }
    const steps = buildWorkflowMacroSteps([
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: SHOT, tab: 'page', region: area },
      { type: 'appSwitch', applicationId: 'snippingtool' },
      { type: 'click', applicationId: 'snippingtool', target: 'zone:3x2' },
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: PASTE, tab: 'chat' }
    ])
    expect(steps).toEqual([
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', keys: SHOT, region: area, tab: 'page' },
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', keys: PASTE, tab: 'chat' },
      { type: 'shortcut', keys: ['Enter'] }
    ])
  })
})
