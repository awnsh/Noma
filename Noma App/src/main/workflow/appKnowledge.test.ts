import { describe, expect, it } from 'vitest'
import {
  categoryOf,
  chainPlausibility,
  inAppCoherence,
  inAppLabel,
  isAmbientApp,
  matchRealisticWorkflow,
  pairPlausibility
} from './appKnowledge'

describe('appKnowledge', () => {
  it('categorizes known apps and stays silent on unknown ones', () => {
    expect(categoryOf('resolve')).toBe('video')
    expect(categoryOf('adobe premiere pro')).toBe('video')
    expect(categoryOf('idea64')).toBe('editor')
    expect(categoryOf('windowsterminal')).toBe('terminal')
    expect(categoryOf('some-random-app')).toBeNull()
    expect(categoryOf(null)).toBeNull()
    expect(isAmbientApp('spotify')).toBe(true)
  })

  it('rates realistic hops high and absurd hops low', () => {
    expect(pairPlausibility('code', 'windowsterminal')).toBeGreaterThan(0.9)
    expect(pairPlausibility('windowsterminal', 'chrome')).toBeGreaterThan(0.7)
    expect(pairPlausibility('spotify', 'explorer')).toBeLessThan(0.1)
    // categorized but unusual: a video editor straight into a git client
    expect(pairPlausibility('resolve', 'githubdesktop')).toBeLessThan(0.25)
    // unknown app: no opinion either way
    expect(pairPlausibility('mystery', 'code')).toBe(0.5)
  })

  it('names a recognized workflow and lifts its chain score', () => {
    const chain = ['code', 'windowsterminal', 'chrome']
    expect(matchRealisticWorkflow(chain)?.name).toBe('Run and preview')
    expect(chainPlausibility(chain)).toBeGreaterThanOrEqual(0.9)
  })

  it("does not let one absurd hop hide behind a plausible rest", () => {
    expect(chainPlausibility(['resolve', 'githubdesktop', 'code'])).toBeLessThan(0.5)
  })

  it('has no opinion on a single-app chain', () => {
    expect(chainPlausibility(['code', 'code'])).toBeNull()
  })

  it('knows app-specific shortcut names, e.g. Blade in DaVinci Resolve', () => {
    expect(inAppLabel('resolve', ['Control', 'B'])).toBe('Blade')
    expect(inAppLabel('code', ['Control', 'B'])).toBeNull()
    expect(inAppLabel('photoshop', ['Control', 'J'])).toBe('Duplicate layer')
  })

  it('scores in-app step pairs by whether they belong together', () => {
    expect(inAppCoherence('photoshop', 'Control+J', 'Control+T')).toBeGreaterThan(0.8)
    expect(inAppCoherence('adobe premiere pro', 'Control+K', 'Control+M')).toBeLessThan(0.5)
    expect(inAppCoherence('code', 'Control+A', 'Control+C')).toBe(0.5)
    expect(inAppCoherence('unknown-app', 'Control+J', 'Control+T')).toBe(0.5)
  })
})
