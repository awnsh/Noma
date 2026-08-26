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

  it('also reports the same-shortcut-repeated case as a sequence when back-to-back', () => {
    // 4 events 1s apart -> 3 consecutive A->A pairs, crossing SEQUENCE_THRESHOLD.
    const events = [1, 2, 3, 4].map((i) => shortcutEvent(['Control', 'S'], i * 1000))
    const patterns = detectPatterns(events)
    expect(patterns.some((p) => p.kind === 'repeatedSequence')).toBe(true)
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
