import { describe, expect, it } from 'vitest'
import { buildWorkflowMacroSteps } from './macroSteps'

/** This platform's region screenshot: Win+Shift+S, or Ctrl+Cmd+Shift+4 on a Mac. */
const SHOT = process.platform === 'darwin' ? ['Control', 'Meta', 'Shift', '4'] : ['Meta', 'Shift', 'S']

describe('buildWorkflowMacroSteps; tabs and screenshot areas', () => {
  it('carries the tab and area onto the macro, and drops the hand-worked overlay', () => {
    const area = { x: 10, y: 20, width: 300, height: 200 }
    const steps = buildWorkflowMacroSteps([
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: SHOT, tab: 'page', region: area },
      { type: 'appSwitch', applicationId: 'snippingtool' },
      { type: 'click', applicationId: 'snippingtool', target: 'zone:3x2' },
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: ['Control', 'V'], tab: 'chat' }
    ])
    expect(steps).toEqual([
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', keys: SHOT, region: area, tab: 'page' },
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', keys: ['Control', 'V'], tab: 'chat' },
      { type: 'shortcut', keys: ['Enter'] }
    ])
  })
})
