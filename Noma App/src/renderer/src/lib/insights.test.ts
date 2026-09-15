import { describe, expect, it } from 'vitest'
import type { DetectedPattern } from '@shared/types'
import { workflowStepPlainText } from './insights'

describe('workflowStepPlainText', () => {
  it('describes a crossAppWorkflow pattern as switching between two named apps', () => {
    const pattern: DetectedPattern = {
      id: 'workflow:x',
      kind: 'crossAppWorkflow',
      applicationId: 'code',
      applicationIds: ['code', 'claude'],
      description: 'raw',
      count: 5,
      steps: [
        { type: 'appSwitch', applicationId: 'code' },
        { type: 'appSwitch', applicationId: 'claude' }
      ]
    }
    expect(workflowStepPlainText(pattern, { code: 'Visual Studio Code', claude: 'Claude Code' })).toBe(
      'You frequently switch between Visual Studio Code and Claude Code.'
    )
  })

  it('describes a multiStepWorkflow pattern as a repeated chain with a real count', () => {
    const pattern: DetectedPattern = {
      id: 'multistep:x',
      kind: 'multiStepWorkflow',
      applicationId: 'code',
      applicationIds: ['code', 'claude'],
      contextApplicationId: 'code',
      consistency: 1,
      description: 'raw',
      count: 8,
      steps: [
        { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
        { type: 'appSwitch', applicationId: 'claude' }
      ]
    }
    expect(workflowStepPlainText(pattern, { claude: 'Claude Code' })).toBe(
      "You've repeated Screenshot → Claude Code 8 times today."
    )
  })

  it('falls back to the raw description for any other pattern kind', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:x',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: 'Control+S used 5 times',
      count: 5,
      comboKeys: ['Control', 'S']
    }
    expect(workflowStepPlainText(pattern)).toBe('Control+S used 5 times')
  })
})
