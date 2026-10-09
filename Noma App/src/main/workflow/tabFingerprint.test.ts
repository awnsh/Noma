import { describe, expect, it } from 'vitest'
import { fingerprintTabTitle, tabTitleFromWindowTitle } from './tabFingerprint'

describe('tabTitleFromWindowTitle', () => {
  it('drops the browser suffix, profile name included', () => {
    expect(tabTitleFromWindowTitle('Inbox - Gmail - Google Chrome')).toBe('Inbox - Gmail')
    expect(tabTitleFromWindowTitle('ChatGPT - Google Chrome - Ansh')).toBe('ChatGPT')
  })

  it("drops Edge's tab count, which changes as tabs open and close", () => {
    // Edge puts the profile before its name; it stays, which is fine: the
    // same window title is read when recording and when replaying.
    expect(tabTitleFromWindowTitle('Claude and 3 more pages - Personal - Microsoft​ Edge')).toBe('Claude - Personal')
  })
})

describe('fingerprintTabTitle', () => {
  it('is stable, short, and never contains the title', () => {
    const print = fingerprintTabTitle('ChatGPT', 'secret')
    expect(print).toBe(fingerprintTabTitle('ChatGPT', 'secret'))
    expect(print).toMatch(/^[0-9a-f]{16}$/)
    expect(print).not.toContain('Chat')
  })

  it('differs per tab and per install', () => {
    expect(fingerprintTabTitle('ChatGPT', 'secret')).not.toBe(fingerprintTabTitle('Claude', 'secret'))
    expect(fingerprintTabTitle('ChatGPT', 'secret')).not.toBe(fingerprintTabTitle('ChatGPT', 'other install'))
  })
})
