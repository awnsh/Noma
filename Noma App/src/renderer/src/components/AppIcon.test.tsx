// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { FlowApi } from '@shared/types'
import { AppIcon } from './AppIcon'
import { useApplicationsStore } from '../stores/applicationsStore'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CHROME_ICON_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return { ...overrides } as unknown as FlowApi
}

beforeEach(() => {
  // The store is a module-level singleton (see applicationsStore.ts) —
  // reset it between tests so one test's seeded application can't leak
  // into the next.
  useApplicationsStore.setState({ byId: {} })
})

/**
 * These tests exist to prove the full renderer-side chain actually wires
 * together — `applicationId` -> `useApplicationsStore` (executablePath) ->
 * `useOsIcon` (the IPC call to the main process's real `app.getFileIcon`
 * result, mocked here at the `window.flow` boundary) -> a real `<img
 * src>` in the DOM. `iconService.test.ts` already proves the main-process
 * half (a real path in, a real PNG data URL out); this proves the
 * renderer doesn't silently drop that value anywhere between the IPC
 * response and the pixel on screen.
 */
describe('AppIcon — real OS icon end to end', () => {
  it('renders a real <img> whose src is exactly the data URL the main process returned', async () => {
    useApplicationsStore.setState({
      byId: { chrome: { id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe', executablePath: CHROME_PATH } }
    })
    const getApplicationIcon = vi.fn().mockResolvedValue(CHROME_ICON_DATA_URL)
    window.flow = mockFlow({ getApplicationIcon })

    const { container } = render(<AppIcon applicationId="chrome" name="Google Chrome" />)

    // Before the (mocked) IPC round trip resolves, there's no real icon yet
    // — the hand-drawn fallback glyph renders instead, never a blank icon.
    expect(container.querySelector('img')).not.toBeInTheDocument()

    const img = await waitFor(() => {
      const el = container.querySelector('img')
      expect(el).toBeInTheDocument()
      return el as HTMLImageElement
    })

    expect(getApplicationIcon).toHaveBeenCalledWith(CHROME_PATH)
    expect(img.getAttribute('src')).toBe(CHROME_ICON_DATA_URL)
  })

  it('never calls getApplicationIcon for an application with no known executable path', async () => {
    useApplicationsStore.setState({
      byId: { spotify: { id: 'spotify', name: 'Spotify', processName: 'Spotify.exe' } }
    })
    const getApplicationIcon = vi.fn()
    window.flow = mockFlow({ getApplicationIcon })

    const { container } = render(<AppIcon applicationId="spotify" name="Spotify" />)

    expect(getApplicationIcon).not.toHaveBeenCalled()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('falls back to the hand-drawn glyph, never a broken <img>, when the OS has no icon for the path', async () => {
    useApplicationsStore.setState({
      byId: {
        mystery: { id: 'mystery', name: 'Some Arbitrary App', processName: 'mystery.exe', executablePath: 'C:\\gone.exe' }
      }
    })
    const getApplicationIcon = vi.fn().mockResolvedValue(null)
    window.flow = mockFlow({ getApplicationIcon })

    const { container } = render(<AppIcon applicationId="mystery" name="Some Arbitrary App" />)

    await waitFor(() => expect(getApplicationIcon).toHaveBeenCalledWith('C:\\gone.exe'))
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
