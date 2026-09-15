import { describe, expect, it } from 'vitest'
import { suggestionForPattern } from './suggestionRules'
import type { DetectedPattern } from '@shared/types'

describe('suggestionForPattern', () => {
  it('returns null for a frequentControl pattern (not actionable on its own)', () => {
    const pattern: DetectedPattern = {
      id: 'control:code::ctrl-run',
      kind: 'frequentControl',
      applicationId: 'code',
      description: 'Control "ctrl-run" activated 7 times',
      count: 7,
      controlId: 'ctrl-run'
    }
    expect(suggestionForPattern(pattern)).toBeNull()
  })

  it('generates a pending suggestion for a repeatedShortcut pattern', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:code::Control+Shift+P',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: 'Control+Shift+P used 5 times',
      count: 5,
      comboKeys: ['Control', 'Shift', 'P']
    }
    const suggestion = suggestionForPattern(pattern)
    expect(suggestion).not.toBeNull()
    expect(suggestion?.id).toBe('suggestion:shortcut:code::Control+Shift+P')
    expect(suggestion?.status).toBe('pending')
    expect(suggestion?.title).toContain('Control+Shift+P')
    expect(suggestion?.explanation).toContain('5 times')
    expect(suggestion?.explanation).toContain('code')
    expect(suggestion?.applicationId).toBe('code')
    expect(suggestion?.action).toEqual({
      kind: 'assignShortcutToControl',
      comboKeys: ['Control', 'Shift', 'P']
    })
  })

  it('generates a pending suggestion for a repeatedSequence pattern', () => {
    const pattern: DetectedPattern = {
      id: 'sequence:code::Control+C->Control+V',
      kind: 'repeatedSequence',
      applicationId: 'code',
      description: 'Control+C → Control+V repeated 3 times',
      count: 3,
      sequence: ['Control+C', 'Control+V']
    }
    const suggestion = suggestionForPattern(pattern)
    expect(suggestion).not.toBeNull()
    expect(suggestion?.title.toLowerCase()).toContain('macro')
    expect(suggestion?.explanation).toContain('Control+C → Control+V')
    expect(suggestion?.applicationId).toBe('code')
    expect(suggestion?.action).toEqual({
      kind: 'createMacroAndAssignToControl',
      sequence: ['Control+C', 'Control+V']
    })
  })

  it('raises confidence for a higher count, at or above the threshold', () => {
    const base: Omit<DetectedPattern, 'count'> = {
      id: 'shortcut:code::Control+S',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: '',
      comboKeys: ['Control', 'S']
    } as Omit<DetectedPattern, 'count'>

    const atThreshold = suggestionForPattern({ ...base, count: 5 } as DetectedPattern)
    const wellAbove = suggestionForPattern({ ...base, count: 20 } as DetectedPattern)

    expect(atThreshold!.confidence).toBeLessThan(wellAbove!.confidence)
  })

  it('clamps confidence to [0.05, 0.95] regardless of bias', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:code::Control+S',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: '',
      count: 5,
      comboKeys: ['Control', 'S']
    }
    expect(suggestionForPattern(pattern, 10)!.confidence).toBeLessThanOrEqual(0.95)
    expect(suggestionForPattern(pattern, -10)!.confidence).toBeGreaterThanOrEqual(0.05)
  })

  it('a positive confidenceBias increases confidence relative to no bias', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:code::Control+S',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: '',
      count: 5,
      comboKeys: ['Control', 'S']
    }
    const unbiased = suggestionForPattern(pattern, 0)!.confidence
    const biased = suggestionForPattern(pattern, 0.1)!.confidence
    expect(biased).toBeGreaterThan(unbiased)
  })

  it('attaches a confidenceBreakdown with the real numbers behind the confidence shown', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:code::Control+S',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: '',
      count: 8,
      comboKeys: ['Control', 'S']
    }
    const suggestion = suggestionForPattern(pattern, 0.1, { accepted: 2, rejected: 0 })
    expect(suggestion?.confidenceBreakdown).toEqual({
      occurrenceCount: 8,
      threshold: 5,
      baseConfidence: 0.5 + (8 - 5) * 0.05,
      historyBias: 0.1,
      priorAccepted: 2,
      priorRejected: 0
    })
  })

  it('uses the sequence threshold (not the shortcut one) for a repeatedSequence breakdown', () => {
    const pattern: DetectedPattern = {
      id: 'sequence:code::Control+C->Control+V',
      kind: 'repeatedSequence',
      applicationId: 'code',
      description: '',
      count: 4,
      sequence: ['Control+C', 'Control+V']
    }
    const suggestion = suggestionForPattern(pattern)
    expect(suggestion?.confidenceBreakdown?.threshold).toBe(3)
    expect(suggestion?.confidenceBreakdown?.occurrenceCount).toBe(4)
  })

  it('uses the resolved application name in the explanation when the caller provides one', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:code::Control+S',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: '',
      count: 5,
      comboKeys: ['Control', 'S']
    }
    const suggestion = suggestionForPattern(pattern, 0, { accepted: 0, rejected: 0 }, 'Visual Studio Code')
    expect(suggestion?.explanation).toContain('Visual Studio Code')
    expect(suggestion?.explanation).not.toContain('in code ')
  })

  it('falls back to the raw applicationId when no application name is provided', () => {
    const pattern: DetectedPattern = {
      id: 'sequence:code::Control+C->Control+V',
      kind: 'repeatedSequence',
      applicationId: 'code',
      description: '',
      count: 3,
      sequence: ['Control+C', 'Control+V']
    }
    const suggestion = suggestionForPattern(pattern)
    expect(suggestion?.explanation).toContain('in code')
  })

  it('generates an informational suggestion for a crossAppWorkflow pattern, with no applicationId or action', () => {
    const pattern: DetectedPattern = {
      id: 'workflow:app:screenshot->app:code',
      kind: 'crossAppWorkflow',
      applicationId: 'code',
      applicationIds: ['screenshot', 'code'],
      description: 'screenshot → code repeated 4 times',
      count: 4,
      steps: [
        { type: 'appSwitch', applicationId: 'screenshot' },
        { type: 'appSwitch', applicationId: 'code' }
      ]
    }
    const suggestion = suggestionForPattern(pattern)
    expect(suggestion).not.toBeNull()
    expect(suggestion?.applicationId).toBeNull()
    expect(suggestion?.action).toBeUndefined()
    expect(suggestion?.explanation).toContain('4 times')
  })

  it('names every application in a crossAppWorkflow chain by its resolved display name', () => {
    const pattern: DetectedPattern = {
      id: 'workflow:app:screenshot->app:code',
      kind: 'crossAppWorkflow',
      applicationId: 'code',
      applicationIds: ['screenshot', 'code'],
      description: '',
      count: 4,
      steps: [
        { type: 'appSwitch', applicationId: 'screenshot' },
        { type: 'appSwitch', applicationId: 'code' }
      ]
    }
    const suggestion = suggestionForPattern(pattern, 0, { accepted: 0, rejected: 0 }, null, {
      screenshot: 'Snip & Sketch',
      code: 'Visual Studio Code'
    })
    expect(suggestion?.explanation).toContain('Snip & Sketch → Visual Studio Code')
  })

  it('attaches chainApplicationNames to a crossAppWorkflow suggestion, for a UI to render the chain visually', () => {
    const pattern: DetectedPattern = {
      id: 'workflow:app:screenshot->app:code',
      kind: 'crossAppWorkflow',
      applicationId: 'code',
      applicationIds: ['screenshot', 'code'],
      description: '',
      count: 4,
      steps: [
        { type: 'appSwitch', applicationId: 'screenshot' },
        { type: 'appSwitch', applicationId: 'code' }
      ]
    }
    const suggestion = suggestionForPattern(pattern, 0, { accepted: 0, rejected: 0 }, null, {
      screenshot: 'Snip & Sketch',
      code: 'Visual Studio Code'
    })
    expect(suggestion?.chainApplicationNames).toEqual({
      screenshot: 'Snip & Sketch',
      code: 'Visual Studio Code'
    })
  })

  it('names a crossAppWorkflow chain\'s consistent closing step when one was found', () => {
    const pattern: DetectedPattern = {
      id: 'workflow:app:code->key:code:Control+V',
      kind: 'crossAppWorkflow',
      applicationId: 'code',
      applicationIds: ['code'],
      description: '',
      count: 4,
      steps: [
        { type: 'appSwitch', applicationId: 'code' },
        { type: 'shortcut', applicationId: 'code', comboKeys: ['Control', 'V'] }
      ],
      closingStep: { type: 'appSwitch', applicationId: 'git' }
    }
    const suggestion = suggestionForPattern(pattern, 0, { accepted: 0, rejected: 0 }, null, {
      git: 'GitHub Desktop'
    })
    expect(suggestion?.explanation).toContain('then GitHub Desktop')
  })

  it('produces a stable, deterministic id derived from the pattern id (for dedup)', () => {
    const pattern: DetectedPattern = {
      id: 'shortcut:code::Control+S',
      kind: 'repeatedShortcut',
      applicationId: 'code',
      description: '',
      count: 5,
      comboKeys: ['Control', 'S']
    }
    const a = suggestionForPattern(pattern)
    const b = suggestionForPattern({ ...pattern, count: 12 })
    expect(a?.id).toBe(b?.id)
  })

  describe('multiStepWorkflow (WORKFLOW LEARNING)', () => {
    function flagshipPattern(overrides: Partial<Extract<DetectedPattern, { kind: 'multiStepWorkflow' }>> = {}) {
      return {
        id: 'multistep:key:code:Meta+Shift+S->app:claude->key:claude:Control+V->app:code',
        kind: 'multiStepWorkflow' as const,
        applicationId: 'code',
        applicationIds: ['code', 'claude'],
        contextApplicationId: 'code',
        description: 'Screenshot → claude → Paste → code repeated 8 times',
        count: 8,
        consistency: 1,
        steps: [
          { type: 'shortcut' as const, applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
          { type: 'appSwitch' as const, applicationId: 'claude' },
          { type: 'shortcut' as const, applicationId: 'claude', comboKeys: ['Control', 'V'] },
          { type: 'appSwitch' as const, applicationId: 'code' }
        ],
        ...overrides
      }
    }

    it('generates a pending, executable suggestion naming the chain and the app it starts in', () => {
      const suggestion = suggestionForPattern(flagshipPattern(), 0, { accepted: 0, rejected: 0 }, 'Visual Studio Code', {
        claude: 'Claude Code',
        code: 'Visual Studio Code'
      })
      expect(suggestion).not.toBeNull()
      expect(suggestion?.status).toBe('pending')
      expect(suggestion?.title).toBe('Noma noticed a workflow')
      expect(suggestion?.explanation).toContain('Screenshot')
      expect(suggestion?.explanation).toContain('Claude Code')
      expect(suggestion?.explanation).toContain('Paste')
      expect(suggestion?.explanation).toContain('8 times')
      // Offered in the *starting* application's context, not a floating
      // global suggestion, and not the crossed-into app.
      expect(suggestion?.applicationId).toBe('code')
      expect(suggestion?.action).toEqual({
        kind: 'createWorkflowMacroAndAssignToControl',
        steps: flagshipPattern().steps
      })
      expect(suggestion?.chainApplicationNames).toEqual({
        claude: 'Claude Code',
        code: 'Visual Studio Code'
      })
    })

    it('reduces confidence for a lower-consistency (more approximate) match', () => {
      const consistent = suggestionForPattern(flagshipPattern({ consistency: 1 }))
      const approximate = suggestionForPattern(flagshipPattern({ consistency: 0.5 }))
      expect(approximate!.confidence).toBeLessThan(consistent!.confidence)
    })

    it('uses the multi-step workflow threshold for its confidence breakdown', () => {
      const suggestion = suggestionForPattern(flagshipPattern())
      expect(suggestion?.confidenceBreakdown?.threshold).toBe(3)
      expect(suggestion?.confidenceBreakdown?.occurrenceCount).toBe(8)
    })

    it('produces a stable, deterministic id for dedup', () => {
      const a = suggestionForPattern(flagshipPattern())
      const b = suggestionForPattern(flagshipPattern({ count: 20 }))
      expect(a?.id).toBe(b?.id)
    })
  })
})
