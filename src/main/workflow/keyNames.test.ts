import { describe, expect, it } from 'vitest'
import { UiohookKey } from 'uiohook-napi'
import { keyCodeForName, keyNameForCode } from './keyNames'
import {
  DOM_CODE_TO_KEY_NAME,
  DOM_MODIFIER_CODE_TO_NAME
} from '@shared/constants/domKeyCodes'

describe('keyNameForCode', () => {
  it('resolves a letter keycode to its name', () => {
    expect(keyNameForCode(UiohookKey.S)).toBe('S')
  })

  it('returns undefined for an unrecognized code', () => {
    expect(keyNameForCode(999999)).toBeUndefined()
  })
})

describe('keyCodeForName', () => {
  it('resolves canonical modifier names to a keycode', () => {
    expect(keyCodeForName('Control')).toBe(UiohookKey.Ctrl)
    expect(keyCodeForName('Alt')).toBe(UiohookKey.Alt)
    expect(keyCodeForName('Meta')).toBe(UiohookKey.Meta)
    expect(keyCodeForName('Shift')).toBe(UiohookKey.Shift)
  })

  it('resolves a plain key name the same way capture produces it', () => {
    expect(keyCodeForName('S')).toBe(UiohookKey.S)
    expect(keyCodeForName('F5')).toBe(UiohookKey.F5)
    expect(keyCodeForName('Backquote')).toBe(UiohookKey.Backquote)
  })

  it('returns undefined for a name not in the vocabulary (fail closed)', () => {
    expect(keyCodeForName('not-a-real-key')).toBeUndefined()
    expect(keyCodeForName('`')).toBeUndefined()
  })

  it('round-trips through keyNameForCode for non-modifier keys', () => {
    const name = keyNameForCode(UiohookKey.P)
    expect(name).toBeDefined()
    expect(keyCodeForName(name!)).toBe(UiohookKey.P)
  })
})

// Regression coverage for exactly the class of bug that shipped once
// already (Spotify's seed data using 'Left'/'Right' instead of
// 'ArrowLeft'/'ArrowRight'): every name the renderer's ShortcutRecorder
// can produce from a DOM KeyboardEvent must be something the main-process
// executor can actually resolve back to a real keycode. If this test
// fails, the Control Mapping Editor could silently save an unexecutable
// shortcut.
describe('DOM_CODE_TO_KEY_NAME (ShortcutRecorder vocabulary)', () => {
  it('every mapped trigger-key name resolves to a real keycode', () => {
    for (const [domCode, keyName] of Object.entries(DOM_CODE_TO_KEY_NAME)) {
      expect(keyCodeForName(keyName), `${domCode} -> "${keyName}" does not resolve`).toBeDefined()
    }
  })

  it('every mapped modifier name resolves to a real keycode', () => {
    for (const [domCode, modifierName] of Object.entries(DOM_MODIFIER_CODE_TO_NAME)) {
      expect(
        keyCodeForName(modifierName),
        `${domCode} -> "${modifierName}" does not resolve`
      ).toBeDefined()
    }
  })
})
