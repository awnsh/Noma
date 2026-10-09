import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearExpectedAppSwitches, consumeExpectedAppSwitch, markExpectedAppSwitch } from './selfInjectedSwitches'

beforeEach(() => clearExpectedAppSwitches())
afterEach(() => vi.useRealTimers())

describe('selfInjectedSwitches', () => {
  it('consumes a matching mark exactly once', () => {
    markExpectedAppSwitch('claude')
    expect(consumeExpectedAppSwitch('claude')).toBe(true)
    // A real switch into the same app a moment later is the user's own.
    expect(consumeExpectedAppSwitch('claude')).toBe(false)
  })

  it('never suppresses a switch into a different app', () => {
    markExpectedAppSwitch('claude')
    expect(consumeExpectedAppSwitch('chrome')).toBe(false)
    expect(consumeExpectedAppSwitch(null)).toBe(false)
    expect(consumeExpectedAppSwitch('claude')).toBe(true)
  })

  it('expires, so a focus that never landed cannot swallow a later real switch', () => {
    vi.useFakeTimers()
    markExpectedAppSwitch('claude', 1000)
    vi.advanceTimersByTime(1001)
    expect(consumeExpectedAppSwitch('claude')).toBe(false)
  })

  it('clears every pending mark', () => {
    markExpectedAppSwitch('claude')
    clearExpectedAppSwitches()
    expect(consumeExpectedAppSwitch('claude')).toBe(false)
  })
})
