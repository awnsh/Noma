import { describe, expect, it } from 'vitest'
import type { WorkflowEvent, WorkflowStep } from '@shared/types'
import { chainMakesSense, isBrowserTabSwitchCombo, shortcutRole } from './workflowSense'
import { detectPatterns } from './patternDetection'
import { buildWorkflowMacroSteps } from './macroSteps'
import { isMac } from '../platform'

/**
 * What Flow understands inside an app (2026-10-13): highlights, deleting a
 * highlight, and which browser tab a step happened in.
 */

const command = isMac ? 'Meta' : 'Control'
const COPY = [command, 'C']
const PASTE = [command, 'V']
const TAB_A = 'tab:aaaaaaaaaaaaaaaa'
const TAB_B = 'tab:bbbbbbbbbbbbbbbb'

const app = (applicationId: string): WorkflowStep => ({ type: 'appSwitch', applicationId })
const key = (applicationId: string, ...comboKeys: string[]): WorkflowStep => ({ type: 'shortcut', applicationId, comboKeys })
const click = (applicationId: string, target: string): WorkflowStep => ({ type: 'click', applicationId, target })
const highlight = (applicationId: string): WorkflowStep => click(applicationId, 'select')

const shortcutEvent = (applicationId: string, comboKeys: string[], timestamp: number): WorkflowEvent => ({
  applicationId,
  eventType: 'shortcut',
  comboKeys,
  timestamp
})
const clickEvent = (applicationId: string, clickTarget: string, timestamp: number): WorkflowEvent => ({
  applicationId,
  eventType: 'click',
  clickTarget,
  timestamp
})
const switchEvent = (applicationId: string, timestamp: number): WorkflowEvent => ({ applicationId, eventType: 'appSwitch', timestamp })

/** The same round done `times` times, a minute apart. */
function repeated(round: (start: number) => WorkflowEvent[], times = 4): WorkflowEvent[] {
  return Array.from({ length: times }, (_, index) => round((index + 1) * 60_000)).flat()
}

describe('Delete after a highlight', () => {
  it('is its own role, while Ctrl+Delete is still getting around', () => {
    expect(shortcutRole(['Delete'])).toBe('delete')
    expect(shortcutRole(['Backspace'])).toBe('delete')
    expect(shortcutRole(['Control', 'Delete'])).toBe('navigation')
  })

  it('only makes sense right after a highlight or Select all', () => {
    expect(chainMakesSense([key('resolve', 'Control', 'B'), highlight('resolve'), key('resolve', 'Delete')])).toBe(true)
    expect(chainMakesSense([key('resolve', 'Control', 'B'), key('resolve', 'Delete')])).toBe(false)
    expect(chainMakesSense([key('code', 'Control', 'S'), key('code', command, 'A'), key('code', 'Delete')])).toBe(true)
  })

  it('"Highlight → Delete" alone saves nothing', () => {
    expect(chainMakesSense([highlight('resolve'), key('resolve', 'Delete')])).toBe(false)
  })
})

describe('highlights in a chain', () => {
  it('copying the highlighted part into another app makes sense', () => {
    expect(chainMakesSense([highlight('chrome'), key('chrome', ...COPY), app('winword'), key('winword', ...PASTE)])).toBe(true)
  })

  it('a highlight has to have something done to it, in the same app', () => {
    expect(chainMakesSense([key('chrome', ...COPY), highlight('chrome'), app('winword'), key('winword', ...PASTE)])).toBe(false)
    expect(chainMakesSense([key('winword', 'Control', 'B'), highlight('winword')])).toBe(false)
  })

  it('highlighting in two apps is two steps, not one repeated', () => {
    expect(
      chainMakesSense([
        highlight('chrome'),
        key('chrome', ...COPY),
        app('winword'),
        highlight('winword'),
        key('winword', ...PASTE)
      ])
    ).toBe(true)
  })
})

describe('browser tabs', () => {
  it("knows a browser's own tab-switching keys", () => {
    expect(isBrowserTabSwitchCombo(['Control', 'Tab'], false)).toBe(true)
    expect(isBrowserTabSwitchCombo(['Control', 'Shift', 'Tab'], false)).toBe(true)
    expect(isBrowserTabSwitchCombo(['Control', '3'], false)).toBe(true)
    expect(isBrowserTabSwitchCombo(['Meta', '3'], true)).toBe(true)
    expect(isBrowserTabSwitchCombo(['Meta', 'Alt', 'ArrowRight'], true)).toBe(true)
    expect(isBrowserTabSwitchCombo(['Control', 'T'], false)).toBe(false)
    expect(isBrowserTabSwitchCombo(['Control', '3'], true)).toBe(false)
  })

  it('going between tabs only does nothing; doing something in each does', () => {
    expect(chainMakesSense([click('chrome', TAB_A), click('chrome', TAB_B)])).toBe(false)
    expect(
      chainMakesSense([click('chrome', TAB_A), key('chrome', ...COPY), click('chrome', TAB_B), key('chrome', ...PASTE)])
    ).toBe(true)
  })

  it('learns "copy in one tab, paste in another" inside one browser', () => {
    const events = repeated((start) => [
      clickEvent('chrome', TAB_A, start),
      clickEvent('chrome', 'select', start + 2_000),
      shortcutEvent('chrome', COPY, start + 3_000),
      // How the user got there is dropped: the tab it landed on is the step.
      shortcutEvent('chrome', ['Control', 'Tab'], start + 4_000),
      clickEvent('chrome', TAB_B, start + 4_000),
      shortcutEvent('chrome', PASTE, start + 5_000)
    ])
    const workflow = detectPatterns(events).find((pattern) => pattern.kind === 'multiStepWorkflow')
    expect(workflow?.kind === 'multiStepWorkflow' && workflow.steps.map((step) => (step.type === 'click' ? step.target : step.type))).toEqual([
      TAB_A,
      'select',
      'shortcut',
      TAB_B,
      'shortcut'
    ])
    expect(workflow?.description).toContain('Go to a tab → Highlight → Copy')
  })
})

describe('detection with highlights', () => {
  it('learns "highlight in Chrome, copy, paste into Word" with the highlight as a step', () => {
    const events = repeated((start) => [
      clickEvent('chrome', 'select', start),
      shortcutEvent('chrome', COPY, start + 1_000),
      switchEvent('winword', start + 3_000),
      shortcutEvent('winword', PASTE, start + 4_000)
    ])
    const workflow = detectPatterns(events).find((pattern) => pattern.kind === 'multiStepWorkflow')
    expect(workflow?.description).toMatch(/^Highlight → Copy → winword → Paste/)
  })

  it('a drag and then a Shift+click to extend it are one highlight', () => {
    const events = repeated((start) => [
      shortcutEvent('resolve', ['Control', 'B'], start),
      clickEvent('resolve', 'select', start + 1_000),
      clickEvent('resolve', 'select', start + 1_500),
      shortcutEvent('resolve', ['Delete'], start + 2_500)
    ])
    const workflow = detectPatterns(events).find((pattern) => pattern.kind === 'multiStepWorkflow')
    expect(workflow?.kind === 'multiStepWorkflow' && workflow.steps).toEqual([
      key('resolve', 'Control', 'B'),
      highlight('resolve'),
      key('resolve', 'Delete')
    ])
  })

  it('a quick double-click-then-copy is not mistaken for mashing', () => {
    const events = repeated((start) => [
      clickEvent('chrome', 'select', start),
      shortcutEvent('chrome', COPY, start + 250),
      switchEvent('winword', start + 2_000),
      shortcutEvent('winword', PASTE, start + 3_000)
    ])
    expect(detectPatterns(events).some((pattern) => pattern.kind === 'multiStepWorkflow')).toBe(true)
  })
})

describe('replaying a highlight', () => {
  it('keeps the highlight as a step that clicks nothing, and the tab as where to go', () => {
    const steps = buildWorkflowMacroSteps([click('chrome', TAB_A), highlight('chrome'), key('chrome', ...COPY)])
    expect(steps).toEqual([
      { type: 'click', target: TAB_A, applicationId: 'chrome' },
      { type: 'click', target: 'select', applicationId: 'chrome' },
      { type: 'shortcut', keys: COPY }
    ])
  })
})
