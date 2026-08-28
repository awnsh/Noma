import { describe, expect, it } from 'vitest'
import { getLearningStats } from './learningStats'
import { REPEATED_SHORTCUT_THRESHOLD, SEQUENCE_THRESHOLD } from '../workflow/patternDetection'

describe('getLearningStats', () => {
  it('returns a card for each actionable pattern kind, with its real threshold', () => {
    const stats = getLearningStats(() => ({ accepted: 0, rejected: 0, bias: 0 }))
    const kinds = stats.kinds.map((k) => k.kind)
    expect(kinds).toEqual(['repeatedShortcut', 'repeatedSequence'])

    const shortcutStats = stats.kinds.find((k) => k.kind === 'repeatedShortcut')
    expect(shortcutStats?.threshold).toBe(REPEATED_SHORTCUT_THRESHOLD)
    const sequenceStats = stats.kinds.find((k) => k.kind === 'repeatedSequence')
    expect(sequenceStats?.threshold).toBe(SEQUENCE_THRESHOLD)
  })

  it('never includes frequentControl (it never produces a suggestion)', () => {
    const stats = getLearningStats(() => ({ accepted: 0, rejected: 0, bias: 0 }))
    expect(stats.kinds.some((k) => k.kind === 'frequentControl')).toBe(false)
  })

  it('passes the injected history straight through per kind', () => {
    const stats = getLearningStats((kind) =>
      kind === 'repeatedShortcut' ? { accepted: 3, rejected: 1, bias: 0.075 } : { accepted: 0, rejected: 0, bias: 0 }
    )
    const shortcutStats = stats.kinds.find((k) => k.kind === 'repeatedShortcut')
    expect(shortcutStats).toMatchObject({ accepted: 3, rejected: 1, bias: 0.075 })
  })
})
