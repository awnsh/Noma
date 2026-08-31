import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventType, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi'
import { CaptureService, comboFromKeydownEvent } from './captureService'
import { __resetSelfInjectedGuardForTesting, markSelfInjected } from './selfInjectedKeys'

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

describe('CaptureService — ignores its own synthetic keystrokes', () => {
  beforeEach(() => {
    __resetSelfInjectedGuardForTesting()
  })

  // handleKeydown is private — accessed directly here (TS's `private` is
  // compile-time only) rather than through the real uIOhook.start(), the
  // same way comboFromKeydownEvent above is tested without a real hook.
  function fireKeydown(service: CaptureService, event: UiohookKeyboardEvent): void {
    ;(service as unknown as { handleKeydown: (event: UiohookKeyboardEvent) => void }).handleKeydown(
      event
    )
  }

  it('does not report a combo that was just marked as self-injected (e.g. a control press)', () => {
    const onCombo = vi.fn()
    const service = new CaptureService(onCombo)

    markSelfInjected(['Control', 'F5'])
    fireKeydown(service, keydown(UiohookKey.F5, { ctrlKey: true }))

    expect(onCombo).not.toHaveBeenCalled()
  })

  it('still reports a real, never-marked combo normally', () => {
    const onCombo = vi.fn()
    const service = new CaptureService(onCombo)

    fireKeydown(service, keydown(UiohookKey.S, { ctrlKey: true }))

    expect(onCombo).toHaveBeenCalledTimes(1)
    expect(onCombo).toHaveBeenCalledWith(
      expect.objectContaining({ comboKeys: ['Control', 'S'] })
    )
  })

  it('only swallows one occurrence per mark — a genuine repeat right after is captured', () => {
    const onCombo = vi.fn()
    const service = new CaptureService(onCombo)

    markSelfInjected(['Control', 'F5'])
    fireKeydown(service, keydown(UiohookKey.F5, { ctrlKey: true })) // suppressed (the echo)
    fireKeydown(service, keydown(UiohookKey.F5, { ctrlKey: true })) // the user's own, real press

    expect(onCombo).toHaveBeenCalledTimes(1)
  })
})
