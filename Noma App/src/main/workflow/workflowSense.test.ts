import { describe, expect, it } from 'vitest'
import type { WorkflowEvent, WorkflowStep } from '@shared/types'
import { chainMakesSense, isTrivialShortcut, shortcutRole, storedSuggestionMakesSense } from './workflowSense'
import { detectPatterns } from './patternDetection'

const app = (applicationId: string): WorkflowStep => ({ type: 'appSwitch', applicationId })
const key = (applicationId: string, ...comboKeys: string[]): WorkflowStep => ({
  type: 'shortcut',
  applicationId,
  comboKeys
})
const click = (applicationId: string, target: string): WorkflowStep => ({ type: 'click', applicationId, target })

describe('shortcutRole', () => {
  it('knows getting around and taking back from doing something', () => {
    expect(shortcutRole(['Alt', 'Tab'])).toBe('navigation')
    expect(shortcutRole(['Control', 'Backspace'])).toBe('navigation')
    expect(shortcutRole(['Control', 'Shift', 'ArrowLeft'])).toBe('navigation')
    expect(shortcutRole(['Control', 'Z'])).toBe('undo')
    expect(shortcutRole(['Control', 'Shift', 'Z'])).toBe('redo')
    expect(shortcutRole(['Control', 'C'])).toBe('copy')
    expect(shortcutRole(['Control', 'Shift', 'V'])).toBe('paste')
    expect(shortcutRole(['Meta', 'Shift', 'S'])).toBe('screenshot')
    expect(shortcutRole(['Control', 'S'])).toBe('action')
    expect(shortcutRole(['Control', 'Shift', 'T'])).toBe('action')
  })

  it('treats one-reflex basics as not worth a control of their own', () => {
    expect(isTrivialShortcut(['Control', 'C'])).toBe(true)
    expect(isTrivialShortcut(['Control', 'A'])).toBe(true)
    expect(isTrivialShortcut(['Alt', 'Tab'])).toBe(true)
    expect(isTrivialShortcut(['Control', 'Shift', 'T'])).toBe(false)
    expect(isTrivialShortcut(['Meta', 'Shift', 'S'])).toBe(false)
  })
})

describe('chainMakesSense; workflows the user accepted still pass', () => {
  it.each([
    ['Screenshot → Claude → Paste → VS Code', [key('code', 'Meta', 'Shift', 'S'), app('claude'), key('claude', 'Control', 'V'), app('code')]],
    ['Edit → Select all → Copy', [click('notepad', 'label:Edit'), click('notepad', 'label:Select all'), key('notepad', 'Control', 'C')]],
    ['Copy → click into place → Paste', [key('code', 'Control', 'C'), click('code', 'zone:1x6'), key('code', 'Control', 'V')]],
    ['Paste → Save', [key('code', 'Control', 'V'), key('code', 'Control', 'S')]],
    ['Run → check the browser', [click('code', 'label:Run Python File'), click('code', 'zone:1x4'), app('chrome')]],
    ['Explorer → Teams (attach a file)', [app('explorer'), app('ms-teams')]],
    ['GitHub Desktop → Push', [app('githubdesktop'), click('githubdesktop', 'label:Push origin')]],
    ['Copy in Chrome → Edge → Paste as plain text', [key('chrome', 'Control', 'C'), app('msedge'), key('msedge', 'Control', 'Shift', 'V')]],
    ['Copy → Edge → Select all → Paste (replace)', [key('chrome', 'Control', 'C'), app('msedge'), key('msedge', 'Control', 'A'), key('msedge', 'Control', 'V')]],
    ['Save → check the browser', [key('code', 'Control', 'S'), app('chrome')]]
  ])('%s', (_, steps) => {
    expect(chainMakesSense(steps)).toBe(true)
  })
})

describe('chainMakesSense: the junk from real data is refused', () => {
  it.each([
    ['only switching windows', [app('claude'), app('chrome'), app('msedge')]],
    ['an unrelated two-app hop', [app('ms-teams'), app('msedge')]],
    ['starting in an app where nothing happens', [app('chrome'), app('msedge'), key('msedge', 'Control', 'A')]],
    ['visiting Chrome and doing nothing', [key('onenote', 'Control', 'C'), app('chrome'), app('msedge'), key('msedge', 'Control', 'V')]],
    ['Alt+Tab as a step', [key('winword', 'Alt', 'Tab'), app('winword'), key('winword', 'Control', 'V')]],
    ['Undo as a step', [key('claude', 'Control', 'V'), key('claude', 'Control', 'Z')]],
    ['a system window', [app('chrome'), app('shellhost'), app('explorer')]],
    ['ending on a click at an unnamed spot', [key('code', 'Control', 'S'), click('code', 'zone:2x6')]],
    ['starting on a click at an unnamed spot', [click('notepad', 'zone:1x8'), key('notepad', 'Control', 'C')]],
    ['one round seen twice', [app('msedge'), key('msedge', 'Control', 'C'), key('msedge', 'Control', 'V'), key('msedge', 'Control', 'C'), key('msedge', 'Control', 'V')]],
    ['ping-pong between two apps', [app('claude'), key('claude', 'Control', 'C'), app('chrome'), key('chrome', 'Control', 'V'), app('claude'), key('claude', 'Control', 'K'), app('chrome')]],
    ['Paste before the Copy it pastes', [key('chrome', 'Control', 'V'), app('onenote'), key('onenote', 'Control', 'C')]],
    ['Copy then Paste in one app', [key('claude', 'Control', 'C'), key('claude', 'Control', 'V')]],
    ['Copy with nowhere for it to go', [app('chrome'), key('chrome', 'Control', 'C')]],
    ['Paste with nothing copied', [app('explorer'), key('explorer', 'Control', 'V')]],
    ['Select all then Paste in one app', [key('excel', 'Control', 'A'), key('excel', 'Control', 'V')]],
    ['ending on Select all', [key('excel', 'Control', 'V'), key('excel', 'Control', 'A')]],
    ['the same button twice', [click('code', 'label:Run Python File'), app('explorer'), click('explorer', 'label:Run Python File')]],
    ['leaving for an app with nothing done there', [app('windowsterminal'), key('windowsterminal', 'Control', 'K'), app('python3.13')]]
  ])('%s', (_, steps) => {
    expect(chainMakesSense(steps)).toBe(false)
  })
})

describe('storedSuggestionMakesSense; re-checking suggestions made before the rules', () => {
  it.each([
    ['suggestion:multistep:app:claude->app:chrome->app:msedge', false],
    ['suggestion:shortcut:msedge::Control+A', false],
    ['suggestion:shortcut:Claude::Alt+Tab', false],
    ['suggestion:sequence:chrome::Control+Z->Control+Shift+Z', false],
    ['suggestion:sequence:claude::Control+C->Control+V', false],
    ['suggestion:workflow:app:explorer->app:shellhost', false],
    ['suggestion:multistep:key:code:Control+S->click:code:zone:2x6', false],
    ['suggestion:shortcut:chrome::Control+Shift+T', true],
    ['suggestion:sequence:code::Control+V->Control+S', true],
    ['suggestion:workflow:app:githubdesktop->click:githubdesktop:label:Push origin', true],
    ['suggestion:multistep:click:notepad:label:Edit->click:notepad:label:Select all->key:notepad:Control+C', true],
    ['suggestion:control:code::ctrl-run', true]
  ])('%s → %s', (id, expected) => {
    expect(storedSuggestionMakesSense(id)).toBe(expected)
  })
})

describe('detectPatterns; noise is removed before detection', () => {
  const shortcut = (applicationId: string, timestamp: number, ...comboKeys: string[]): WorkflowEvent => ({
    applicationId,
    eventType: 'shortcut',
    comboKeys,
    timestamp
  })
  const switchTo = (applicationId: string, timestamp: number): WorkflowEvent => ({
    applicationId,
    eventType: 'appSwitch',
    timestamp
  })

  it('an Undo takes back the action it undid, leaving what was meant', () => {
    // Copy in Chrome, go to Edge, Paste, Undo, Paste as plain text; what
    // was meant is "Copy → Edge → Paste as plain text".
    const events = [0, 1, 2, 3].flatMap((i) => {
      const t = i * 60_000
      return [
        switchTo('chrome', t),
        shortcut('chrome', t + 1_000, 'Control', 'C'),
        switchTo('msedge', t + 3_000),
        shortcut('msedge', t + 4_000, 'Control', 'V'),
        shortcut('msedge', t + 5_000, 'Control', 'Z'),
        shortcut('msedge', t + 6_000, 'Control', 'Shift', 'V')
      ]
    })
    const text = JSON.stringify(detectPatterns(events))
    expect(text).not.toContain('"Z"')
    expect(text).not.toContain('msedge:Control+V')
    expect(text).toContain('key:msedge:Control+Shift+V')
  })

  it('Alt+Tab and system windows never appear in a detected pattern', () => {
    const events = [0, 1, 2, 3, 4, 5].flatMap((i) => {
      const t = i * 60_000
      return [
        shortcut('chrome', t, 'Alt', 'Tab'),
        switchTo('shellhost', t + 1_000),
        switchTo('winword', t + 3_000),
        shortcut('winword', t + 4_000, 'Control', 'V'),
        shortcut('winword', t + 5_000, 'Alt', 'Tab')
      ]
    })
    const text = JSON.stringify(detectPatterns(events))
    expect(text).not.toContain('Tab')
    expect(text).not.toContain('shellhost')
  })

  it('reports a repeated loop once, from where the user usually starts it', () => {
    const click = (target: string, timestamp: number): WorkflowEvent => ({
      applicationId: 'notepad',
      eventType: 'click',
      clickTarget: target,
      timestamp
    })
    // Five rounds back to back, so every rotation also repeats 3+ times.
    const events = [0, 1, 2, 3, 4].flatMap((i) => {
      const t = i * 6_000
      return [click('label:Edit', t), click('label:Select all', t + 1_500), shortcut('notepad', t + 3_000, 'Control', 'C')]
    })
    const chains = detectPatterns(events).filter((p) => p.kind === 'multiStepWorkflow')
    expect(chains).toHaveLength(1)
    if (chains[0].kind === 'multiStepWorkflow') {
      expect(chains[0].steps[0]).toMatchObject({ type: 'click', target: 'label:Edit' })
    }
  })

  it('no longer offers to put Copy, Paste or Select all on a control', () => {
    const events = [0, 1, 2, 3, 4, 5].flatMap((i) => [
      shortcut('msedge', i * 60_000, 'Control', 'A'),
      shortcut('msedge', i * 60_000 + 20_000, 'Control', 'C')
    ])
    expect(detectPatterns(events).filter((p) => p.kind === 'repeatedShortcut')).toEqual([])
  })
})
