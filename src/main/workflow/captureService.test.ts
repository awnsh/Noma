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
})
