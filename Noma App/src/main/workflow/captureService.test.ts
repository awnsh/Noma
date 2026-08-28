import { describe, expect, it } from 'vitest'
import { EventType, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi'
import { comboFromKeydownEvent } from './captureService'

function keydown(
  keycode: number,
  modifiers: Partial<Pick<UiohookKeyboardEvent, 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'>> = {}
): UiohookKeyboardEvent {
  return {
    type: EventType.EVENT_KEY_PRESSED,
    time: 0,
    keycode,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers
  }
}

describe('comboFromKeydownEvent', () => {
  it('returns null for a bare modifier keydown (e.g. just pressing Ctrl)', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.Ctrl, { ctrlKey: true }))).toBeNull()
  })

  it('returns null for a plain letter with no modifiers held (ordinary typing)', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.A))).toBeNull()
  })

  it('returns null for Shift + letter alone (typing a capital)', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.A, { shiftKey: true }))).toBeNull()
  })

  it('returns the combo for Control + a letter', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.S, { ctrlKey: true }))).toEqual([
      'Control',
      'S'
    ])
  })

  it('returns the combo for Control + Shift + a letter (e.g. VS Code command palette)', () => {
    expect(
      comboFromKeydownEvent(keydown(UiohookKey.P, { ctrlKey: true, shiftKey: true }))
    ).toEqual(['Control', 'Shift', 'P'])
  })

  it('returns the combo for Alt + a key', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.Tab, { altKey: true }))).toEqual([
      'Alt',
      'Tab'
    ])
  })

  it('returns the combo for Meta (Windows key) + a letter', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.D, { metaKey: true }))).toEqual(['Meta', 'D'])
  })

  it('returns null for the right-hand modifier keycodes too', () => {
    expect(comboFromKeydownEvent(keydown(UiohookKey.CtrlRight, { ctrlKey: true }))).toBeNull()
    expect(comboFromKeydownEvent(keydown(UiohookKey.AltRight, { altKey: true }))).toBeNull()
    expect(comboFromKeydownEvent(keydown(UiohookKey.ShiftRight, { shiftKey: true }))).toBeNull()
  })

  // These two cases exist specifically to demonstrate — not just assert —
  // the guarantee documented in docs/security-review.md: typing a password
  // never produces a captured combo, capitals and symbols included, because
  // it never requires holding Control, Alt, or Meta.
  it('captures nothing across an entire password typed with no modifiers', () => {
    const password = [
      UiohookKey.H,
      UiohookKey.U,
      UiohookKey.N,
      UiohookKey.T,
      UiohookKey.E,
      UiohookKey.R,
      UiohookKey[2] // the digit "2"
    ]
    const combos = password.map((keycode) => comboFromKeydownEvent(keydown(keycode)))
    expect(combos.every((combo) => combo === null)).toBe(true)
  })

  it('captures nothing across a password typed with Shift for capitals and symbols', () => {
    const password = [
      keydown(UiohookKey.H, { shiftKey: true }), // "H"
      keydown(UiohookKey.U), // "u"
      keydown(UiohookKey[1], { shiftKey: true }), // "!"
      keydown(UiohookKey[2], { shiftKey: true }) // "@"
    ]
    const combos = password.map(comboFromKeydownEvent)
    expect(combos.every((combo) => combo === null)).toBe(true)
  })
})
