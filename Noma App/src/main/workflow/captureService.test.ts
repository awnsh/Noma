import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventType, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi'
import { CaptureService, classifyKeydown, comboFromKeydownEvent } from './captureService'
import { __resetSelectionForTesting } from './selection'
import { isMac } from '../platform'
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
  it('returns null for a bare modifier keydown (e.g. pressing Ctrl)', () => {
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

  // These two cases exist specifically to demonstrate; not assert
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

describe('CaptureService; ignores its own synthetic keystrokes', () => {
  beforeEach(() => {
    __resetSelfInjectedGuardForTesting()
  })

  // handleKeydown is private; accessed directly here (TS's `private` is
  // compile-time only) rather than through the real uIOhook.start(), the
  // same way comboFromKeydownEvent above is tested without a real hook.
  function fireKeydown(service: CaptureService, event: UiohookKeyboardEvent): void {
    ;(service as unknown as { handleKeydown: (event: UiohookKeyboardEvent) => void }).handleKeydown(
      event
    )
  }

  it('does not report a combo that was marked as self-injected (e.g. a control press)', () => {
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

  it('only swallows one occurrence per mark: a genuine repeat right after is captured', () => {
    const onCombo = vi.fn()
    const service = new CaptureService(onCombo)

    markSelfInjected(['Control', 'F5'])
    fireKeydown(service, keydown(UiohookKey.F5, { ctrlKey: true })) // suppressed (the echo)
    fireKeydown(service, keydown(UiohookKey.F5, { ctrlKey: true })) // the user's own, real press

    expect(onCombo).toHaveBeenCalledTimes(1)
  })
})

describe('CaptureService: highlights and Delete', () => {
  function service() {
    const combos: string[][] = []
    const highlights: number[] = []
    const capture = new CaptureService(
      (event) => combos.push(event.comboKeys),
      (event) => highlights.push(event.timestamp)
    )
    capture.setCurrentApplicationId('notepad')
    return { capture, combos, highlights }
  }

  beforeEach(() => {
    __resetSelfInjectedGuardForTesting()
    __resetSelectionForTesting()
  })

  it('a run of Shift+arrows is one highlight, and records no key', () => {
    const { capture, combos, highlights } = service()
    capture.handleKey(keydown(UiohookKey.ArrowRight, { shiftKey: true }), 1000)
    capture.handleKey(keydown(UiohookKey.ArrowRight, { shiftKey: true }), 1100)
    // A word at a time: Ctrl+Shift on Windows, Option+Shift on a Mac.
    capture.handleKey(keydown(UiohookKey.ArrowRight, { shiftKey: true, ...(isMac ? { altKey: true } : { ctrlKey: true }) }), 1200)
    expect(highlights).toEqual([1000])
    expect(combos).toEqual([])
  })

  it('records Delete or Backspace straight after a highlight, once', () => {
    const { capture, combos } = service()
    capture.handleKey(keydown(UiohookKey.ArrowLeft, { shiftKey: true }), 1000)
    capture.handleKey(keydown(UiohookKey.Backspace), 1500)
    capture.handleKey(keydown(UiohookKey.Backspace), 1700)
    expect(combos).toEqual([['Backspace']])
  })

  it('never records Delete while typing, or after typing following a highlight', () => {
    const { capture, combos } = service()
    capture.handleKey(keydown(UiohookKey.Backspace), 500)
    capture.handleKey(keydown(UiohookKey.ArrowLeft, { shiftKey: true }), 1000)
    capture.handleKey(keydown(UiohookKey.A), 1100)
    capture.handleKey(keydown(UiohookKey.Delete), 1200)
    expect(combos).toEqual([])
  })

  it('Select all arms Delete too, and Delete long after a highlight is ignored', () => {
    const { capture, combos } = service()
    capture.handleKey(keydown(UiohookKey.A, { ctrlKey: true }), 1000)
    capture.handleKey(keydown(UiohookKey.Delete), 1200)
    capture.handleKey(keydown(UiohookKey.ArrowLeft, { shiftKey: true }), 2000)
    capture.handleKey(keydown(UiohookKey.Delete), 60_000)
    expect(combos).toEqual([['Control', 'A'], ['Delete']])
  })

  it('a Delete in another app than the highlight is ignored', () => {
    const { capture, combos } = service()
    capture.handleKey(keydown(UiohookKey.ArrowLeft, { shiftKey: true }), 1000)
    capture.setCurrentApplicationId('code')
    capture.handleKey(keydown(UiohookKey.Delete), 1200)
    expect(combos).toEqual([])
  })

  it("Flow's own replayed Delete is not the user's", () => {
    const { capture, combos } = service()
    capture.handleKey(keydown(UiohookKey.ArrowLeft, { shiftKey: true }), Date.now())
    markSelfInjected(['Delete'])
    capture.handleKey(keydown(UiohookKey.Delete), Date.now())
    expect(combos).toEqual([])
  })

  it('Alt+Shift+Arrow (copy line in editors) is a command, not a highlight', () => {
    expect(classifyKeydown(keydown(UiohookKey.ArrowDown, { shiftKey: true, altKey: true }), false).kind).not.toBe('keyboardHighlight')
    expect(classifyKeydown(keydown(UiohookKey.ArrowDown, { shiftKey: true, altKey: true }), true).kind).toBe('keyboardHighlight')
  })
})
