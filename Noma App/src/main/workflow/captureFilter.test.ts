import { describe, expect, it } from 'vitest'
import { shouldCaptureKeyCombo } from './captureFilter'

describe('shouldCaptureKeyCombo', () => {
  it('rejects a single key press', () => {
    expect(shouldCaptureKeyCombo(['A'])).toBe(false)
  })

  it('rejects an empty combo', () => {
    expect(shouldCaptureKeyCombo([])).toBe(false)
  })

  it('rejects a Shift-only combo (typing a capital letter)', () => {
    expect(shouldCaptureKeyCombo(['Shift', 'A'])).toBe(false)
  })

  it('rejects Shift plus a symbol key', () => {
    expect(shouldCaptureKeyCombo(['Shift', '1'])).toBe(false)
  })

  it('accepts Control plus a letter', () => {
    expect(shouldCaptureKeyCombo(['Control', 'S'])).toBe(true)
  })

  it('accepts Alt plus a key', () => {
    expect(shouldCaptureKeyCombo(['Alt', 'Tab'])).toBe(true)
  })

  it('accepts Meta (Windows key) plus a letter', () => {
    expect(shouldCaptureKeyCombo(['Meta', 'D'])).toBe(true)
  })

  it('accepts Control + Shift + a letter (e.g. VS Code command palette)', () => {
    expect(shouldCaptureKeyCombo(['Control', 'Shift', 'P'])).toBe(true)
  })

  it('accepts Control + Alt + a key', () => {
    expect(shouldCaptureKeyCombo(['Control', 'Alt', 'Delete'])).toBe(true)
  })

  describe('on macOS, where Option types characters', () => {
    it('never captures Option or Option+Shift with a character key (é, ©, ¬)', () => {
      expect(shouldCaptureKeyCombo(['Alt', 'E'], true)).toBe(false)
      expect(shouldCaptureKeyCombo(['Alt', 'Shift', '2'], true)).toBe(false)
      expect(shouldCaptureKeyCombo(['Alt', 'Space'], true)).toBe(false)
    })

    it('still captures Option with keys that type nothing', () => {
      expect(shouldCaptureKeyCombo(['Alt', 'F5'], true)).toBe(true)
      expect(shouldCaptureKeyCombo(['Alt', 'ArrowLeft'], true)).toBe(true)
    })

    it('still captures Command and Control combos, with or without Option', () => {
      expect(shouldCaptureKeyCombo(['Meta', 'S'], true)).toBe(true)
      expect(shouldCaptureKeyCombo(['Meta', 'Alt', 'I'], true)).toBe(true)
      expect(shouldCaptureKeyCombo(['Control', 'Alt', 'E'], true)).toBe(true)
    })

    it('leaves Windows alone: Alt plus a letter is a menu command there', () => {
      expect(shouldCaptureKeyCombo(['Alt', 'E'], false)).toBe(true)
    })
  })
})
