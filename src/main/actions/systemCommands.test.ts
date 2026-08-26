import { describe, expect, it } from 'vitest'
import { isKnownSystemCommand } from './systemCommands'

describe('isKnownSystemCommand', () => {
  it('accepts the known volume commands', () => {
    expect(isKnownSystemCommand('volumeMute')).toBe(true)
    expect(isKnownSystemCommand('volumeUp')).toBe(true)
    expect(isKnownSystemCommand('volumeDown')).toBe(true)
  })

  it('rejects anything not on the allowlist — never an arbitrary command', () => {
    expect(isKnownSystemCommand('shutdown')).toBe(false)
    expect(isKnownSystemCommand('rm -rf /')).toBe(false)
    expect(isKnownSystemCommand('')).toBe(false)
  })
})
