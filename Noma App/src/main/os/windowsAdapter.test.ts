import { describe, expect, it, vi } from 'vitest'
import { WindowsOSAdapter, appDisplayName } from './windowsAdapter'

const chromeWindow = (hwnd: number) => ({
  processId: 100,
  processName: 'chrome',
  windowTitle: 'Tab',
  path: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  hwnd
})

/** Listens without starting the real PowerShell watcher. */
function listen(adapter: WindowsOSAdapter) {
  const listener = vi.fn()
  ;(adapter as unknown as { listeners: Set<typeof listener> }).listeners.add(listener)
  return listener
}

describe('appDisplayName', () => {
  it("uses the executable's own product name over its process name", () => {
    expect(appDisplayName('Claude', 'claude')).toBe('Claude')
    expect(appDisplayName('Windows Explorer', 'explorer')).toBe('Windows Explorer')
  })

  it('falls back to the process name when the description adds nothing', () => {
    expect(appDisplayName(null, 'WindowsTerminal')).toBe('WindowsTerminal')
    expect(appDisplayName('   ', 'tool')).toBe('tool')
    expect(appDisplayName('x'.repeat(61), 'tool')).toBe('tool')
    // Windows 11's Notepad and Paint, seen in a real run.
    expect(appDisplayName('Notepad.exe', 'Notepad')).toBe('Notepad')
    expect(appDisplayName('mspaint.exe', 'mspaint')).toBe('mspaint')
  })

  it('names a new app by its product name', () => {
    const adapter = new WindowsOSAdapter()
    const listener = listen(adapter)
    adapter.handleForegroundEvent({ ...chromeWindow(1), processName: 'claude', path: 'C:/Claude/claude.exe', description: 'Claude' })
    expect(listener.mock.calls[0][0]).toMatchObject({ id: 'claude', name: 'Claude', processName: 'claude.exe' })
  })
})

describe('WindowsOSAdapter.handleForegroundEvent', () => {
  it('targets the second Chrome window once it comes to the front, without calling it an app switch', () => {
    const adapter = new WindowsOSAdapter()
    const listener = listen(adapter)

    adapter.handleForegroundEvent(chromeWindow(111))
    expect(adapter.getLastKnownWindowHandle()).toBe(111)
    expect(listener).toHaveBeenCalledTimes(1)

    adapter.handleForegroundEvent(chromeWindow(222))
    expect(adapter.getLastKnownWindowHandle()).toBe(222)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('still reports a real switch to another app', () => {
    const adapter = new WindowsOSAdapter()
    const listener = listen(adapter)
    adapter.handleForegroundEvent(chromeWindow(111))
    adapter.handleForegroundEvent({ processId: 200, processName: 'Code', windowTitle: 'x', path: 'C:/VS Code/Code.exe', hwnd: 333 })
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[1][0]).toMatchObject({ id: 'code' })
    expect(adapter.getLastKnownWindowHandle()).toBe(333)
  })
})
