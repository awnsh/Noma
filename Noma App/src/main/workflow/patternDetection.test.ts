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

function appSwitchEvent(applicationId: string | null, timestamp: number): WorkflowEvent {
  return { applicationId, eventType: 'appSwitch', timestamp }
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

describe('detectPatterns — cross-app workflows', () => {
  it('reports a two-step chain repeated across applications', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(appSwitchEvent('screenshot', base))
      events.push(appSwitchEvent('code', base + 2_000))
    }
    const patterns = detectPatterns(events)
    const workflow = patterns.find((p) => p.kind === 'crossAppWorkflow')
    expect(workflow).toMatchObject({ count: 3 })
    expect(workflow?.description).toContain('screenshot')
    expect(workflow?.description).toContain('code')
  })

  it('recognizes an app switch immediately followed by a shortcut in the new app', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(appSwitchEvent('claude', base))
      events.push(shortcutEvent(['Control', 'V'], base + 1_000, 'claude'))
    }
    const workflow = detectPatterns(events).find((p) => p.kind === 'crossAppWorkflow')
    expect(workflow).toMatchObject({ count: 3 })
    // Control+V is common enough to name by what it does — see
    // shortcutDisplayLabel in patternDetection.ts.
    expect(workflow?.description).toContain('Paste')
  })

  it('does not treat a same-app shortcut pair as a cross-app workflow (that stays repeatedSequence)', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 100_000
      events.push(shortcutEvent(['Control', 'C'], base))
      events.push(shortcutEvent(['Control', 'V'], base + 2_000))
    }
    const patterns = detectPatterns(events)
    expect(patterns.some((p) => p.kind === 'crossAppWorkflow')).toBe(false)
    expect(patterns.some((p) => p.kind === 'repeatedSequence')).toBe(true)
  })

  it('does not report a cross-app chain below the threshold', () => {
    const events = [0, 1].flatMap((i) => {
      const base = i * 100_000
      return [appSwitchEvent('screenshot', base), appSwitchEvent('code', base + 2_000)]
    })
    expect(detectPatterns(events).some((p) => p.kind === 'crossAppWorkflow')).toBe(false)
  })

  it('does not link an app switch and a shortcut that are far apart in time', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 3; i++) {
      const base = i * 200_000
      events.push(appSwitchEvent('claude', base))
      events.push(shortcutEvent(['Control', 'V'], base + 60_000, 'claude')) // outside the window
    }
    expect(detectPatterns(events).some((p) => p.kind === 'crossAppWorkflow')).toBe(false)
  })

  it('does not report a cross-app chain spammed in a quick burst', () => {
    const times = [0, 60, 120, 180, 240, 300, 360, 420]
    const events = times.map((t, i) => appSwitchEvent(i % 2 === 0 ? 'screenshot' : 'code', t))
    expect(detectPatterns(events).some((p) => p.kind === 'crossAppWorkflow')).toBe(false)
  })

  it('attaches a consistent closing step once it follows the chain across multiple separate runs', () => {
    // Two runs of "screenshot -> code" repeated twice back-to-back, each
    // run followed a few seconds later by switching to a git client —
    // exactly the "screenshot -> Claude Code, repeated, then commit" shape.
    const events: WorkflowEvent[] = [
      appSwitchEvent('screenshot', 0),
      appSwitchEvent('code', 2_000),
      appSwitchEvent('screenshot', 5_000),
      appSwitchEvent('code', 7_000),
      appSwitchEvent('git', 10_000),
      appSwitchEvent('screenshot', 40_000),
      appSwitchEvent('code', 42_000),
      appSwitchEvent('screenshot', 45_000),
      appSwitchEvent('code', 47_000),
      appSwitchEvent('git', 50_000)
    ]
    const workflow = detectPatterns(events).find((p) => p.kind === 'crossAppWorkflow')
    expect(workflow).toMatchObject({ count: 4 })
    expect(workflow?.description).toContain('usually followed by git')
  })

  it('does not report a closing step that has only followed the chain once', () => {
    const events: WorkflowEvent[] = [
      appSwitchEvent('screenshot', 0),
      appSwitchEvent('code', 2_000),
      appSwitchEvent('screenshot', 5_000),
      appSwitchEvent('code', 7_000),
      appSwitchEvent('git', 10_000),
      // A second run of the same chain — but nothing follows it this time,
      // so "git" has only shown up once and isn't a consistent follow-up yet.
      appSwitchEvent('screenshot', 100_000),
      appSwitchEvent('code', 102_000),
      appSwitchEvent('screenshot', 105_000),
      appSwitchEvent('code', 107_000)
    ]
    const workflow = detectPatterns(events).find((p) => p.kind === 'crossAppWorkflow')
    expect(workflow).toMatchObject({ count: 4 })
    expect(workflow?.description).not.toContain('usually followed by')
  })
})

describe('detectPatterns — multi-step workflow learning', () => {
  /** The flagship story: screenshot -> switch to Claude Code -> paste ->
   *  switch back. Repetitions are spaced far enough apart that they never
   *  chain continuously into each other (see WORKFLOW_STEP_WINDOW_MS). */
  function flagshipWorkflowEvents(repeatCount: number, repeatGapMs = 30_000): WorkflowEvent[] {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < repeatCount; i++) {
      const base = i * repeatGapMs
      events.push(shortcutEvent(['Meta', 'Shift', 'S'], base, 'code'))
      events.push(appSwitchEvent('claude', base + 2_000))
      events.push(shortcutEvent(['Control', 'V'], base + 4_000, 'claude'))
      events.push(appSwitchEvent('code', base + 6_000))
    }
    return events
  }

  it('recognizes the flagship repeated cross-app workflow and names the app it starts in', () => {
    const patterns = detectPatterns(flagshipWorkflowEvents(4))
    const workflows = patterns.filter((p) => p.kind === 'multiStepWorkflow')

    expect(workflows).toHaveLength(1)
    const workflow = workflows[0]
    expect(workflow).toMatchObject({ count: 4, contextApplicationId: 'code' })
    expect(workflow.description).toContain('Screenshot')
    expect(workflow.description).toContain('claude')
    expect(workflow.description).toContain('Paste')
    if (workflow.kind === 'multiStepWorkflow') {
      expect(workflow.consistency).toBe(1)
      expect(workflow.applicationIds).toEqual(['code', 'claude'])
    }
  })

  it('drops the redundant crossAppWorkflow pairs once the fuller chain subsumes them', () => {
    // Every 2-step pair inside the flagship chain (screenshot->claude,
    // claude->paste, paste->code) also clears CROSS_APP_WORKFLOW_THRESHOLD
    // on its own — without subsumption this would surface 3 extra,
    // redundant "Flow noticed a workflow across apps" cards.
    const patterns = detectPatterns(flagshipWorkflowEvents(4))
    expect(patterns.filter((p) => p.kind === 'crossAppWorkflow')).toHaveLength(0)
    expect(patterns.filter((p) => p.kind === 'multiStepWorkflow')).toHaveLength(1)
  })

  it('does not report a multi-step workflow below the threshold', () => {
    const patterns = detectPatterns(flagshipWorkflowEvents(2))
    expect(patterns.some((p) => p.kind === 'multiStepWorkflow')).toBe(false)
  })

  it('tolerates an occurrence with an extra step in the middle (approximate matching)', () => {
    const events = flagshipWorkflowEvents(3)
    // A 4th repetition where an extra, unrelated shortcut happens between
    // the app switch and the paste — e.g. an uncaptured keystroke elsewhere
    // in the flow. Same first/last anchors, one extra middle step.
    const base = 3 * 30_000
    events.push(shortcutEvent(['Meta', 'Shift', 'S'], base, 'code'))
    events.push(appSwitchEvent('claude', base + 2_000))
    events.push(shortcutEvent(['Control', 'Shift', 'L'], base + 3_000, 'claude'))
    events.push(shortcutEvent(['Control', 'V'], base + 4_000, 'claude'))
    events.push(appSwitchEvent('code', base + 6_000))

    const patterns = detectPatterns(events)
    const workflows = patterns.filter((p) => p.kind === 'multiStepWorkflow')
    expect(workflows).toHaveLength(1)
    const workflow = workflows[0]
    expect(workflow.count).toBe(4)
    if (workflow.kind === 'multiStepWorkflow') {
      // 3 of the 4 occurrences matched exactly; one was only approximate.
      expect(workflow.consistency).toBeCloseTo(0.75)
    }
  })

  it('does not merge workflows interrupted by genuinely unrelated actions into the same chain', () => {
    // Same repeated shape, but each repetition is broken up by a long gap
    // in the middle — never continuous, so it never forms one window at
    // all. Repetitions are spaced far enough apart (100s) that the tail of
    // one repetition and the head of the next don't accidentally bridge
    // into a *different* continuous 3-step run of their own.
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 4; i++) {
      const base = i * 100_000
      events.push(shortcutEvent(['Meta', 'Shift', 'S'], base, 'code'))
      events.push(appSwitchEvent('claude', base + 40_000)) // far outside the continuity window
      events.push(shortcutEvent(['Control', 'V'], base + 42_000, 'claude'))
    }
    expect(detectPatterns(events).some((p) => p.kind === 'multiStepWorkflow')).toBe(false)
  })

  it('rejects a low-diversity same-app burst instead of treating it as a workflow', () => {
    // Alternating two same-app shortcuts, no app switch, no third distinct
    // step — exactly the "keypress -> keypress -> keypress" shape STEP 4
    // calls out to avoid, even though it technically repeats.
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 5; i++) {
      const base = i * 1_000
      events.push(shortcutEvent(['Control', 'C'], base, 'code'))
      events.push(shortcutEvent(['Control', 'V'], base + 500, 'code'))
    }
    expect(detectPatterns(events).some((p) => p.kind === 'multiStepWorkflow')).toBe(false)
  })

  it('never reports a workflow shorter than 3 steps', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 5; i++) {
      const base = i * 30_000
      events.push(appSwitchEvent('claude', base))
      events.push(shortcutEvent(['Control', 'V'], base + 2_000, 'claude'))
    }
    expect(detectPatterns(events).some((p) => p.kind === 'multiStepWorkflow')).toBe(false)
  })

  it('still recognizes a long (>6 step) recurring chain via its best sub-window', () => {
    const events: WorkflowEvent[] = []
    for (let i = 0; i < 4; i++) {
      const base = i * 60_000
      events.push(shortcutEvent(['Meta', 'Shift', 'S'], base, 'code'))
      events.push(appSwitchEvent('claude', base + 2_000))
      events.push(shortcutEvent(['Control', 'V'], base + 4_000, 'claude'))
      events.push(shortcutEvent(['Control', 'Enter'], base + 6_000, 'claude'))
      events.push(appSwitchEvent('code', base + 8_000))
      events.push(shortcutEvent(['Control', 'S'], base + 10_000, 'code'))
      events.push(shortcutEvent(['Control', 'Shift', 'F'], base + 12_000, 'code'))
    }
    const workflows = detectPatterns(events).filter((p) => p.kind === 'multiStepWorkflow')
    expect(workflows.length).toBeGreaterThan(0)
    for (const workflow of workflows) {
      if (workflow.kind === 'multiStepWorkflow') {
        expect(workflow.steps.length).toBeLessThanOrEqual(6)
      }
    }
  })

  it('does not report duplicate suggestions for the same recurring chain across repeated calls', () => {
    const events = flagshipWorkflowEvents(4)
    const first = detectPatterns(events).filter((p) => p.kind === 'multiStepWorkflow')
    const second = detectPatterns(events).filter((p) => p.kind === 'multiStepWorkflow')
    expect(first).toHaveLength(1)
    expect(second).toEqual(first)
  })
})
