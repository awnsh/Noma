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
})
