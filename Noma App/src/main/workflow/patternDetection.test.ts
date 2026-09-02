import { describe, expect, it } from 'vitest'
import { detectPatterns } from './patternDetection'
import type { WorkflowEvent } from '@shared/types'

function shortcutEvent(
  comboKeys: string[],
  timestamp: number,
  applicationId: string | null = 'code'
): WorkflowEvent {
  return { applicationId, eventType: 'shortcut', comboKeys, timestamp }
}

function controlEvent(
  controlId: string,
  timestamp: number,
  applicationId: string | null = 'code'
): WorkflowEvent {
  return { applicationId, eventType: 'controlActivation', controlId, timestamp }
}

// Spaced well beyond SEQUENCE_WINDOW_MS so identical back-to-back
// shortcuts don't also register as a repeated A->A sequence — that cross-
// interaction is real (and covered below), just not what these cases test.
const FAR_APART_MS = 60_000

describe('detectPatterns — repeated shortcuts', () => {
  it('does not report a shortcut used below the threshold', () => {
    const events = [1, 2, 3, 4].map((i) => shortcutEvent(['Control', 'S'], i * FAR_APART_MS))
    expect(detectPatterns(events)).toEqual([])
  })

  it('reports a shortcut once it crosses the threshold', () => {
    const events = [1, 2, 3, 4, 5].map((i) => shortcutEvent(['Control', 'S'], i * FAR_APART_MS))
    const patterns = detectPatterns(events)
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      kind: 'repeatedShortcut',
      applicationId: 'code',
      count: 5
    })
    expect(patterns[0].description).toContain('Control+S')
  })

  it('keeps different applications separate even for the same combo', () => {
    const codeEvents = [1, 2, 3, 4, 5].map((i) =>
      shortcutEvent(['Control', 'S'], i * FAR_APART_MS, 'code')
    )
    const chromeEvents = [1, 2].map((i) => shortcutEvent(['Control', 'S'], i * FAR_APART_MS, 'chrome'))
    const patterns = detectPatterns([...codeEvents, ...chromeEvents])
    expect(patterns).toHaveLength(1)
    expect(patterns[0].applicationId).toBe('code')
  })

  it('does NOT also report the same-shortcut-repeated case as a sequence, even back-to-back', () => {
    // Regression: pressing one shortcut rapidly several times (e.g. Ctrl+T
    // x5, fast) used to also register 3+ consecutive A->A pairs as a
    // repeatedSequence, producing a nonsensical "Ctrl+T -> Ctrl+T" two-step
    // macro suggestion for what is honestly just one repeated action.
    const events = [1, 2, 3, 4, 5].map((i) => shortcutEvent(['Control', 'T'], i * 1000))
    const patterns = detectPatterns(events)
    expect(patterns.some((p) => p.kind === 'repeatedSequence')).toBe(false)
    expect(patterns.some((p) => p.kind === 'repeatedShortcut')).toBe(true)
  })
})

describe('detectPatterns — frequent controls', () => {
  it('reports a control once it crosses the threshold', () => {
    const events = [1, 2, 3, 4, 5].map((i) => controlEvent('ctrl-run', i * 1000))
    const patterns = detectPatterns(events)
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({ kind: 'frequentControl', count: 5 })
  })

  it('does not report a control used below the threshold', () => {
    const events = [1, 2].map((i) => controlEvent('ctrl-run', i * 1000))
    expect(detectPatterns(events)).toEqual([])
  })
})

describe('detectPatterns — repeated sequences', () => {
  it('reports a two-step sequence repeated within the time window', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(shortcutEvent(['Control', 'C'], base))
      events.push(shortcutEvent(['Control', 'V'], base + 2_000))
    }
    const patterns = detectPatterns(events)
    const sequence = patterns.find((p) => p.kind === 'repeatedSequence')
    expect(sequence).toMatchObject({ count: 3 })
    expect(sequence?.description).toContain('Control+C → Control+V')
  })

  it('does not link two shortcuts that are far apart in time', () => {
    const events = [
      shortcutEvent(['Control', 'C'], 0),
      shortcutEvent(['Control', 'V'], 60_000) // 60s later, outside the window
    ]
    expect(detectPatterns(events).some((p) => p.kind === 'repeatedSequence')).toBe(false)
  })

  it('ignores identical-combo pairs even when interleaved with a real two-step sequence', () => {
    // A pressed twice fast, then B, repeated 3 times: the A->A pairs must
    // never count, but the real A->B transition still should.
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(shortcutEvent(['Control', 'C'], base))
      events.push(shortcutEvent(['Control', 'C'], base + 500))
      events.push(shortcutEvent(['Control', 'V'], base + 1_000))
    }
    const patterns = detectPatterns(events).filter((p) => p.kind === 'repeatedSequence')
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({ count: 3 })
    expect(patterns[0].description).toContain('Control+C → Control+V')
  })

  it('does not link two shortcuts from different applications', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(shortcutEvent(['Control', 'C'], base, 'code'))
      events.push(shortcutEvent(['Control', 'V'], base + 2_000, 'chrome'))
    }
    expect(detectPatterns(events).some((p) => p.kind === 'repeatedSequence')).toBe(false)
  })
})

describe('detectPatterns — empty input', () => {
  it('returns no patterns for no events', () => {
    expect(detectPatterns([])).toEqual([])
  })
})

describe('detectPatterns — spam vs. a real workflow', () => {
  it('does not report a shortcut spammed in a quick burst, even well past the raw count threshold', () => {
    // 8 presses inside 350ms — key-repeat from holding the key down, or a
    // few seconds of impatient mashing, not 8 separate deliberate uses.
    const events = [0, 50, 100, 150, 200, 250, 300, 350].map((t) => shortcutEvent(['Control', 'S'], t))
    expect(detectPatterns(events)).toEqual([])
  })

  it('does not report a control button spammed in a quick burst', () => {
    const events = [0, 40, 80, 120, 160, 200].map((t) => controlEvent('ctrl-run', t))
    expect(detectPatterns(events)).toEqual([])
  })

  it('still reports a shortcut used the same number of times, genuinely spread across real work', () => {
    // Same raw count as the burst above (8), but spaced like real use —
    // this is exactly the case a spam guard must not also suppress.
    const events = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => shortcutEvent(['Control', 'S'], i * 30_000))
    const patterns = detectPatterns(events)
    expect(patterns.some((p) => p.kind === 'repeatedShortcut' && p.count === 8)).toBe(true)
  })

  it('a burst followed by real spaced-out use only counts the spaced ones', () => {
    // 4 rapid presses (spam, collapses to 1) then 4 more spaced 10s apart
    // (real use) — total raw presses is 8, but only 5 are genuinely
    // separate occurrences, which is exactly enough to cross the threshold.
    const burst = [0, 50, 100, 150]
    const spaced = [10_000, 20_000, 30_000, 40_000]
    const events = [...burst, ...spaced].map((t) => shortcutEvent(['Control', 'S'], t))
    const patterns = detectPatterns(events)
    const shortcut = patterns.find((p) => p.kind === 'repeatedShortcut')
    expect(shortcut?.count).toBe(5)
  })

  it('does not collapse presses that are merely quick, not spammed', () => {
    // 500ms apart is a fast but perfectly plausible deliberate repeat —
    // the guard must not be so aggressive it eats real quick-fire use.
    const events = [0, 1, 2, 3, 4].map((i) => shortcutEvent(['Control', 'S'], i * 500))
    const patterns = detectPatterns(events)
    expect(patterns.find((p) => p.kind === 'repeatedShortcut')?.count).toBe(5)
  })

  it('does not report a Copy/Paste sequence mashed rapidly in a burst', () => {
    // Copy, Paste, Copy, Paste... 8 presses inside half a second — someone
    // testing what Ctrl+C/Ctrl+V do, not a real repeated copy-paste workflow.
    const times = [0, 60, 120, 180, 240, 300, 360, 420]
    const events = times.map((t, i) => shortcutEvent(['Control', i % 2 === 0 ? 'C' : 'V'], t))
    expect(detectPatterns(events)).toEqual([])
  })

  it('still reports a Copy/Paste sequence repeated naturally across real work', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(shortcutEvent(['Control', 'C'], base))
      events.push(shortcutEvent(['Control', 'V'], base + 2_000))
    }
    const patterns = detectPatterns(events)
    expect(patterns.some((p) => p.kind === 'repeatedSequence' && p.count === 3)).toBe(true)
  })

  it('keeps the burst guard scoped per key — spamming one shortcut does not suppress a real pattern in another', () => {
    const spam = [0, 50, 100, 150, 200].map((t) => shortcutEvent(['Control', 'T'], t))
    const real = [0, 1, 2, 3, 4].map((i) => shortcutEvent(['Control', 'S'], i * 30_000))
    const patterns = detectPatterns([...spam, ...real])
    expect(patterns.some((p) => p.description.includes('Control+S'))).toBe(true)
    expect(patterns.some((p) => p.description.includes('Control+T'))).toBe(false)
  })
})
