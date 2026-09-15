import { describe, expect, it } from 'vitest'
import { findMainWindowHandleForProcess, normalizeProcessNameForLookup } from './processWindow'

describe('normalizeProcessNameForLookup', () => {
  it('strips a trailing .exe', () => {
    expect(normalizeProcessNameForLookup('Claude.exe')).toBe('Claude')
  })

  it('is case-insensitive about the .exe suffix', () => {
    expect(normalizeProcessNameForLookup('Code.EXE')).toBe('Code')
  })

  it('leaves a bare process name unchanged', () => {
    expect(normalizeProcessNameForLookup('chrome')).toBe('chrome')
  })

  it('refuses a name containing characters outside the exe-name vocabulary', () => {
    expect(normalizeProcessNameForLookup('evil; Remove-Item -Recurse C:\\')).toBeNull()
    expect(normalizeProcessNameForLookup("$(Get-Process)")).toBeNull()
    expect(normalizeProcessNameForLookup('a`b')).toBeNull()
    expect(normalizeProcessNameForLookup("o'brien.exe")).toBeNull()
  })

  it('refuses an empty name', () => {
    expect(normalizeProcessNameForLookup('')).toBeNull()
  })
})

describe('findMainWindowHandleForProcess', () => {
  it('resolves to null (fails closed) for an invalid process name, without spawning anything', async () => {
    await expect(findMainWindowHandleForProcess('; calc.exe')).resolves.toBeNull()
  })

  it('resolves to null for a process name unlikely to be running', async () => {
    await expect(
      findMainWindowHandleForProcess('DefinitelyNotARunningProcess12345.exe')
    ).resolves.toBeNull()
  }, 10_000)
})
