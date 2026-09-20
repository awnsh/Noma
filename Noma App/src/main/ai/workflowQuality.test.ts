import { describe, expect, it } from 'vitest'
import type { DetectedPattern } from '@shared/types'
import {
  emptyModel,
  extractFeatures,
  judgeDuplicate,
  patternFingerprint,
  relateFingerprints,
  scorePattern,
  shouldSuggest,
  trainModel
} from './workflowQuality'

function multiStep(apps: string[], overrides: Partial<DetectedPattern> = {}): DetectedPattern {
  return {
    id: `multistep:${apps.join('->')}`,
    kind: 'multiStepWorkflow',
    applicationId: apps[0],
    applicationIds: apps,
    contextApplicationId: apps[0],
    steps: apps.map((applicationId) => ({ type: 'appSwitch' as const, applicationId })),
    description: '',
    count: 4,
    sessionCount: 3,
    consistency: 0.9,
    ...overrides
  } as DetectedPattern
}

describe('fingerprints', () => {
  it('is identical for every rotation of the same loop', () => {
    const a = patternFingerprint(multiStep(['x', 'y', 'z']))
    const b = patternFingerprint(multiStep(['y', 'z', 'x']))
    expect(a).toEqual(b)
    expect(relateFingerprints(a, b)).toBe('same')
  })

  it('treats a pair inside a fuller chain as contained, not as a new workflow', () => {
    const pair = patternFingerprint(multiStep(['x', 'y']))
    const chain = patternFingerprint(multiStep(['x', 'y', 'z', 'w']))
    expect(relateFingerprints(pair, chain)).toBe('newInsideExisting')
    expect(relateFingerprints(chain, pair)).toBe('newContainsExisting')
  })

  it('keeps unrelated workflows unrelated', () => {
    expect(relateFingerprints(patternFingerprint(multiStep(['a', 'b'])), patternFingerprint(multiStep(['c', 'd'])))).toBe(
      'unrelated'
    )
  })
})

describe('judgeDuplicate', () => {
  const chain = patternFingerprint(multiStep(['x', 'y', 'z', 'w']))
  const pair = patternFingerprint(multiStep(['x', 'y']))

  it('skips something already suggested in any status', () => {
    for (const status of ['pending', 'accepted', 'rejected', 'dismissed'] as const) {
      expect(judgeDuplicate(chain, [{ id: 's', status, fingerprint: chain }])).toEqual({ action: 'skip' })
    }
  })

  it('skips a pair already covered by a fuller chain', () => {
    expect(judgeDuplicate(pair, [{ id: 's', status: 'rejected', fingerprint: chain }])).toEqual({ action: 'skip' })
  })

  it('replaces a pending pair with the fuller chain, but leaves a resolved pair alone', () => {
    expect(judgeDuplicate(chain, [{ id: 'p', status: 'pending', fingerprint: pair }])).toEqual({
      action: 'supersede',
      ids: ['p']
    })
    expect(judgeDuplicate(chain, [{ id: 'p', status: 'accepted', fingerprint: pair }])).toEqual({ action: 'insert' })
  })
})

describe('quality model', () => {
  it('passes a habitual workflow and rejects a one-burst, inconsistent one before any training', () => {
    const model = emptyModel()
    expect(shouldSuggest(model, extractFeatures(multiStep(['a', 'b', 'c'])))).toBe(true)
    const noise = multiStep(['a', 'b', 'c'], { count: 3, sessionCount: 1, consistency: 0.55 } as Partial<DetectedPattern>)
    expect(shouldSuggest(model, extractFeatures(noise))).toBe(false)
  })

  it('learns from rejections: an app the user keeps rejecting stops being suggested', () => {
    let model = emptyModel()
    const explorer = multiStep(['explorer', 'code', 'chrome'])
    const before = scorePattern(model, extractFeatures(explorer))
    for (let i = 0; i < 3; i++) model = trainModel(model, extractFeatures(explorer), 'rejected')

    expect(scorePattern(model, extractFeatures(explorer))).toBeLessThan(before)
    expect(shouldSuggest(model, extractFeatures(explorer))).toBe(false)
    // ...while a workflow in different apps is barely affected.
    expect(shouldSuggest(model, extractFeatures(multiStep(['figma', 'slack', 'notion'])))).toBe(true)
  })

  it('learns from acceptances, and counts a dismissal as a weaker no than a rejection', () => {
    const features = extractFeatures(multiStep(['a', 'b', 'c']))
    const start = scorePattern(emptyModel(), features)
    expect(scorePattern(trainModel(emptyModel(), features, 'accepted'), features)).toBeGreaterThan(start)
    expect(scorePattern(trainModel(emptyModel(), features, 'dismissed'), features)).toBeGreaterThan(
      scorePattern(trainModel(emptyModel(), features, 'rejected'), features)
    )
  })
})

describe('logical plausibility', () => {
  const chain = (apps: string[]) => multiStep(apps, { count: 4, sessionCount: 3, consistency: 0.9 } as Partial<DetectedPattern>)

  it('suggests realistic workflows and suppresses absurd ones with identical statistics', () => {
    const model = emptyModel()
    expect(shouldSuggest(model, extractFeatures(chain(['code', 'windowsterminal', 'chrome'])))).toBe(true)
    expect(shouldSuggest(model, extractFeatures(chain(['resolve', 'githubdesktop', 'excel'])))).toBe(false)
  })

  it('still lets the user override the prior by accepting an unusual chain', () => {
    let model = emptyModel()
    const unusual = chain(['resolve', 'githubdesktop'])
    expect(shouldSuggest(model, extractFeatures(unusual))).toBe(false)
    for (let i = 0; i < 4; i++) model = trainModel(model, extractFeatures(unusual), 'accepted')
    expect(shouldSuggest(model, extractFeatures(unusual))).toBe(true)
  })

  it('does not penalize chains through apps it does not recognize', () => {
    expect(shouldSuggest(emptyModel(), extractFeatures(chain(['mystery-a', 'mystery-b', 'mystery-c'])))).toBe(true)
  })
})
