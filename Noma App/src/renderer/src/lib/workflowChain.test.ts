import { describe, expect, it } from 'vitest'
import type { Suggestion } from '@shared/types'
import { macroChainSteps, workflowChainSteps } from './workflowChain'

function baseSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 's1',
    title: 't',
    explanation: 'e',
    confidence: 0.6,
    status: 'pending',
    createdAt: Date.now(),
    applicationId: 'code',
    ...overrides
  }
}

describe('workflowChainSteps', () => {
  it('returns null when the suggestion has no action', () => {
    expect(workflowChainSteps(baseSuggestion())).toBeNull()
  })

  it('humanizes a multi-step workflow chain, resolving app names from chainApplicationNames and tagging step kind', () => {
    const steps = workflowChainSteps(
      baseSuggestion({
        chainApplicationNames: { claude: 'Claude Code' },
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [
            { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
            { type: 'appSwitch', applicationId: 'claude' },
            { type: 'shortcut', applicationId: 'claude', comboKeys: ['Control', 'V'] }
          ]
        }
      })
    )
    expect(steps).toEqual([
      { label: 'Screenshot', kind: 'shortcut' },
      { label: 'Claude Code', kind: 'app', applicationId: 'claude' },
      { label: 'Paste', kind: 'shortcut' }
    ])
  })

  it('falls back to the raw application id when no name was resolved, but still carries the real id for logo lookup', () => {
    const steps = workflowChainSteps(
      baseSuggestion({
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: [{ type: 'appSwitch', applicationId: 'unknown-app' }]
        }
      })
    )
    expect(steps).toEqual([{ label: 'unknown-app', kind: 'app', applicationId: 'unknown-app' }])
  })

  it('humanizes a repeatedSequence chain as shortcut-kind steps', () => {
    const steps = workflowChainSteps(
      baseSuggestion({ action: { kind: 'createMacroAndAssignToControl', sequence: ['Control+C', 'Control+V'] } })
    )
    expect(steps).toEqual([
      { label: 'Copy', kind: 'shortcut' },
      { label: 'Paste', kind: 'shortcut' }
    ])
  })

  it('returns a single-item chain for a plain shortcut suggestion', () => {
    const steps = workflowChainSteps(
      baseSuggestion({ action: { kind: 'assignShortcutToControl', comboKeys: ['Control', 'Shift', 'P'] } })
    )
    // Not a special-cased label — falls back to formatShortcutCaption's
    // abbreviation ("Control" -> "Ctrl").
    expect(steps).toEqual([{ label: 'Ctrl+Shift+P', kind: 'shortcut' }])
  })
})

describe('macroChainSteps', () => {
  it('humanizes shortcut and focusApplication macro steps (tagging kind), skipping other step types', () => {
    const chain = macroChainSteps(
      [
        { type: 'shortcut', keys: ['Meta', 'Shift', 'S'] },
        { type: 'focusApplication', applicationId: 'claude' },
        { type: 'delay', ms: 200 },
        { type: 'shortcut', keys: ['Control', 'V'] }
      ],
      { claude: 'Claude Code' }
    )
    expect(chain).toEqual([
      { label: 'Screenshot', kind: 'shortcut' },
      { label: 'Claude Code', kind: 'app', applicationId: 'claude' },
      { label: 'Paste', kind: 'shortcut' }
    ])
  })
})
