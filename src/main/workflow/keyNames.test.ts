import { describe, expect, it } from 'vitest'
import { UiohookKey } from 'uiohook-napi'
import { keyCodeForName, keyNameForCode } from './keyNames'

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
