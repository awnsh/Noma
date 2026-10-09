import { describe, expect, it } from 'vitest'
import { buildWorkflowMacroSteps } from './macroSteps'

describe('buildWorkflowMacroSteps; tabs and screenshot areas', () => {
  it('carries the tab and area onto the macro, and drops the hand-worked overlay', () => {
    const area = { x: 10, y: 20, width: 300, height: 200 }
    const steps = buildWorkflowMacroSteps([
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: ['Meta', 'Shift', 'S'], tab: 'page', region: area },
      { type: 'appSwitch', applicationId: 'snippingtool' },
      { type: 'click', applicationId: 'snippingtool', target: 'zone:3x2' },
      { type: 'appSwitch', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', applicationId: 'chrome', comboKeys: ['Control', 'V'], tab: 'chat' }
    ])
    expect(steps).toEqual([
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', keys: ['Meta', 'Shift', 'S'], region: area, tab: 'page' },
      { type: 'focusApplication', applicationId: 'chrome', tab: 'page' },
      { type: 'shortcut', keys: ['Control', 'V'], tab: 'chat' },
      { type: 'shortcut', keys: ['Enter'] }
    ])
  })
})
