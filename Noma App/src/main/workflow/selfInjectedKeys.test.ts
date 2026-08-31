import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetSelfInjectedGuardForTesting, isSelfInjected, markSelfInjected } from './selfInjectedKeys'

beforeEach(() => {
  __resetSelfInjectedGuardForTesting()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('markSelfInjected / isSelfInjected', () => {
  it('reports and consumes a marked combo — a matching real keydown right after is suppressed', () => {
    markSelfInjected(['Control', 'F5'])
    expect(isSelfInjected(['Control', 'F5'])).toBe(true)
  })

  it('consumes the mark: the same combo checked a second time is not suppressed again', () => {
    markSelfInjected(['Control', 'F5'])
    expect(isSelfInjected(['Control', 'F5'])).toBe(true)
    expect(isSelfInjected(['Control', 'F5'])).toBe(false)
  })

  it('matches regardless of key order (modifier order can differ between storage and the hook)', () => {
    markSelfInjected(['Shift', 'Control', 'F'])
    expect(isSelfInjected(['Control', 'Shift', 'F'])).toBe(true)
  })

  it('is case-insensitive to key-name casing', () => {
    markSelfInjected(['Control', 'F5'])
    expect(isSelfInjected(['control', 'f5'])).toBe(true)
  })

  it('never suppresses a combo that was never marked (real user shortcuts are unaffected)', () => {
    markSelfInjected(['Control', 'F5'])
    expect(isSelfInjected(['Control', 'S'])).toBe(false)
  })

  it('only consumes one matching entry when several are pending at once', () => {
    markSelfInjected(['Control', 'F5'])
    markSelfInjected(['Control', 'F5'])
    expect(isSelfInjected(['Control', 'F5'])).toBe(true)
    expect(isSelfInjected(['Control', 'F5'])).toBe(true)
    expect(isSelfInjected(['Control', 'F5'])).toBe(false)
  })

  it('expires a stale mark rather than suppressing forever if the matching keydown never arrives', () => {
    vi.useFakeTimers()
    markSelfInjected(['Control', 'F5'])
    vi.advanceTimersByTime(10_000)
    expect(isSelfInjected(['Control', 'F5'])).toBe(false)
  })
})
