import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_COMMAND_CATALOG } from '@shared/constants'

const platform = vi.hoisted(() => ({ isMac: false, isWindows: true }))
const native = vi.hoisted(() => ({
  keybdEvent: vi.fn(),
  postMediaKey: vi.fn((_keyType: number) => true),
  execFile: vi.fn()
}))

vi.mock('../platform', () => ({
  get isMac() {
    return platform.isMac
  },
  get isWindows() {
    return platform.isWindows
  }
}))
vi.mock('./win32', () => ({ KEYEVENTF_KEYUP: 0x0002, KeybdEvent: native.keybdEvent }))
vi.mock('./macMediaKeys', () => ({
  NX_KEYTYPE_PLAY: 16,
  NX_KEYTYPE_NEXT: 17,
  NX_KEYTYPE_PREVIOUS: 18,
  postMediaKey: native.postMediaKey
}))
vi.mock('child_process', () => ({ execFile: native.execFile }))

import { executeSystemCommand, isKnownSystemCommand } from './systemCommands'

function usePlatform(name: 'windows' | 'mac' | 'linux'): void {
  platform.isMac = name === 'mac'
  platform.isWindows = name === 'windows'
}

beforeEach(() => {
  native.keybdEvent.mockReset()
  native.postMediaKey.mockReset().mockReturnValue(true)
  native.execFile.mockReset()
  usePlatform('windows')
})

describe('isKnownSystemCommand', () => {
  it('accepts the known volume and media commands', () => {
    for (const command of ['volumeMute', 'volumeUp', 'volumeDown', 'mediaPlayPause', 'mediaNextTrack', 'mediaPrevTrack']) {
      expect(isKnownSystemCommand(command), command).toBe(true)
    }
  })

  it('accepts every catalog entry, so the dropdown never offers a refused command', () => {
    for (const command of SYSTEM_COMMAND_CATALOG) expect(isKnownSystemCommand(command), command).toBe(true)
  })

  it('rejects anything not on the allowlist; never an arbitrary command', () => {
    expect(isKnownSystemCommand('shutdown')).toBe(false)
    expect(isKnownSystemCommand('rm -rf /')).toBe(false)
    expect(isKnownSystemCommand('')).toBe(false)
    expect(isKnownSystemCommand('micMute')).toBe(false)
  })

  it('rejects inherited object keys', () => {
    expect(isKnownSystemCommand('toString')).toBe(false)
    expect(isKnownSystemCommand('__proto__')).toBe(false)
  })
})

describe('executeSystemCommand on Windows', () => {
  it.each([
    ['volumeMute', 0xad],
    ['mediaPlayPause', 0xb3],
    ['mediaNextTrack', 0xb0],
    ['mediaPrevTrack', 0xb1]
  ])('sends %s as a key down then up of VK 0x%s', (command, virtualKey) => {
    expect(executeSystemCommand(command)).toBe(true)
    expect(native.keybdEvent.mock.calls).toEqual([
      [virtualKey, 0, 0, 0],
      [virtualKey, 0, 0x0002, 0]
    ])
  })

  it('refuses an unknown command without touching the keyboard', () => {
    expect(executeSystemCommand('shutdown')).toBe(false)
    expect(native.keybdEvent).not.toHaveBeenCalled()
  })

  it('reports failure if the native call throws', () => {
    native.keybdEvent.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(executeSystemCommand('mediaPlayPause')).toBe(false)
  })
})

describe('executeSystemCommand on macOS', () => {
  beforeEach(() => usePlatform('mac'))

  it.each([
    ['mediaPlayPause', 16],
    ['mediaNextTrack', 17],
    ['mediaPrevTrack', 18]
  ])('posts %s as media key type %s', (command, keyType) => {
    expect(executeSystemCommand(command)).toBe(true)
    expect(native.postMediaKey).toHaveBeenCalledWith(keyType)
    expect(native.keybdEvent).not.toHaveBeenCalled()
    expect(native.execFile).not.toHaveBeenCalled()
  })

  it('reports failure when the media key could not be posted (e.g. no Accessibility access)', () => {
    native.postMediaKey.mockReturnValue(false)
    expect(executeSystemCommand('mediaPlayPause')).toBe(false)
  })

  it('keeps volume on the fixed AppleScript path', () => {
    expect(executeSystemCommand('volumeUp')).toBe(true)
    expect(native.execFile).toHaveBeenCalledWith('osascript', ['-e', expect.stringContaining('output volume')], expect.any(Function))
    expect(native.postMediaKey).not.toHaveBeenCalled()
  })
})

describe('executeSystemCommand on another platform', () => {
  it('fails closed and runs nothing', () => {
    usePlatform('linux')
    for (const command of SYSTEM_COMMAND_CATALOG) expect(executeSystemCommand(command), command).toBe(false)
    expect(native.keybdEvent).not.toHaveBeenCalled()
    expect(native.postMediaKey).not.toHaveBeenCalled()
    expect(native.execFile).not.toHaveBeenCalled()
  })
})
