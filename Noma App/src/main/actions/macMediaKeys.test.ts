import { describe, expect, it, vi } from 'vitest'

vi.mock('../platform', () => ({ isMac: false, isWindows: true }))
vi.mock('./macos', () => ({ isAccessibilityTrusted: () => true }))

import { mediaKeyData1, NX_KEYTYPE_NEXT, NX_KEYTYPE_PLAY, NX_KEYTYPE_PREVIOUS, postMediaKey } from './macMediaKeys'

describe('mediaKeyData1', () => {
  it('packs the key type into the high word and the key state into the next byte', () => {
    expect(mediaKeyData1(NX_KEYTYPE_PLAY, true)).toBe(0x100a00)
    expect(mediaKeyData1(NX_KEYTYPE_PLAY, false)).toBe(0x100b00)
    expect(mediaKeyData1(NX_KEYTYPE_NEXT, true)).toBe(0x110a00)
    expect(mediaKeyData1(NX_KEYTYPE_PREVIOUS, false)).toBe(0x120b00)
  })
})

describe('postMediaKey', () => {
  it('fails closed off macOS without loading any native library', () => {
    expect(postMediaKey(NX_KEYTYPE_PLAY)).toBe(false)
  })
})
