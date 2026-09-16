import { beforeEach, describe, expect, it, vi } from 'vitest'

const getFileIcon = vi.fn()

vi.mock('electron', () => ({
  app: {
    getFileIcon: (...args: unknown[]) => getFileIcon(...args)
  }
}))

// Imported after the mock so `iconService.ts`'s own `import { app } from
// 'electron'` resolves to the mock above, not the real Electron module
// (which, outside a real Electron process, isn't a usable JS API at all —
// see this file's own describe block for why that distinction matters).
const { getApplicationIcon, __clearApplicationIconCacheForTesting } = await import('./iconService')

function fakeNativeImage(dataUrl: string | null): { isEmpty: () => boolean; toDataURL: () => string } {
  return {
    isEmpty: () => dataUrl === null,
    toDataURL: () => dataUrl ?? ''
  }
}

beforeEach(() => {
  getFileIcon.mockReset()
  __clearApplicationIconCacheForTesting()
})

describe('getApplicationIcon', () => {
  it('returns null without calling the OS for a null/undefined path', async () => {
    expect(await getApplicationIcon(null)).toBeNull()
    expect(await getApplicationIcon(undefined)).toBeNull()
    expect(getFileIcon).not.toHaveBeenCalled()
  })

  it('resolves a real PNG data URL from app.getFileIcon', async () => {
    getFileIcon.mockResolvedValue(fakeNativeImage('data:image/png;base64,AAAA'))

    const result = await getApplicationIcon('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')

    expect(result).toBe('data:image/png;base64,AAAA')
    expect(getFileIcon).toHaveBeenCalledWith(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      { size: 'large' }
    )
  })

  it('returns null (never throws) when app.getFileIcon rejects', async () => {
    getFileIcon.mockRejectedValue(new Error('file not found'))
    await expect(getApplicationIcon('C:\\does\\not\\exist.exe')).resolves.toBeNull()
  })

  it('returns null when the OS resolves an empty NativeImage', async () => {
    getFileIcon.mockResolvedValue(fakeNativeImage(null))
    expect(await getApplicationIcon('C:\\some\\app.exe')).toBeNull()
  })

  it('caches by normalized path — only calls the OS once for the same file', async () => {
    getFileIcon.mockResolvedValue(fakeNativeImage('data:image/png;base64,BBBB'))

    await getApplicationIcon('C:\\Apps\\Thing.EXE')
    await getApplicationIcon('c:\\apps\\thing.exe')
    await getApplicationIcon('C:\\Apps\\Thing.EXE')

    expect(getFileIcon).toHaveBeenCalledTimes(1)
  })

  it('dedupes concurrent requests for the same path into one OS call', async () => {
    let resolveIcon: (image: unknown) => void = () => {}
    getFileIcon.mockReturnValue(
      new Promise((resolve) => {
        resolveIcon = resolve
      })
    )

    const first = getApplicationIcon('C:\\Apps\\Slow.exe')
    const second = getApplicationIcon('C:\\Apps\\Slow.exe')
    resolveIcon(fakeNativeImage('data:image/png;base64,CCCC'))

    expect(await first).toBe('data:image/png;base64,CCCC')
    expect(await second).toBe('data:image/png;base64,CCCC')
    expect(getFileIcon).toHaveBeenCalledTimes(1)
  })
})
