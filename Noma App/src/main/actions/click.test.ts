import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeClick } from './click'
import { SendInput, SetCursorPos, WindowFromPoint } from './win32'
import { processForWindow } from './windowProcess'
import { uiaControlFinder } from './uiaControlFinder'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import { isCancelRequested } from './actionExecutor'

// Real input and real UI Automation are mocked: these tests are about the
// checks click.ts makes *before* it will click, which is the part that
// decides whether a replayed workflow lands where it should.
// These cases exercise the Windows path; pin it so they mean the same on a
// macOS CI runner.
vi.mock('../platform', () => ({ isMac: false, isWindows: true }))
vi.mock('./win32', () => ({
  GA_ROOT: 2,
  GetAncestor: vi.fn((hwnd: number) => hwnd),
  GetForegroundWindow: vi.fn(() => 100),
  GetWindowRect: vi.fn((_hwnd: number, rect: Record<string, number>) => {
    Object.assign(rect, { left: 0, top: 0, right: 1600, bottom: 1000 })
    return true
  }),
  IsWindow: vi.fn(() => true),
  GetSystemMetrics: vi.fn((index: number) => ({ 76: 0, 77: 0, 78: 1600, 79: 1000 })[index] ?? 0),
  // One event per call: approach moves, then press, then release.
  SendInput: vi.fn(() => 1),
  SetCursorPos: vi.fn(() => true),
  WindowFromPoint: vi.fn(() => 100),
  INPUT_MOUSE: 0,
  INPUT_SIZE: 40,
  MOUSEEVENTF_LEFTDOWN: 2,
  MOUSEEVENTF_LEFTUP: 4,
  MOUSEEVENTF_MOVE: 1,
  MOUSEEVENTF_ABSOLUTE: 0x8000,
  MOUSEEVENTF_VIRTUALDESK: 0x4000,
  SM_XVIRTUALSCREEN: 76,
  SM_YVIRTUALSCREEN: 77,
  SM_CXVIRTUALSCREEN: 78,
  SM_CYVIRTUALSCREEN: 79
}))
vi.mock('./windowProcess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./windowProcess')>()),
  processForWindow: vi.fn()
}))
vi.mock('./uiaControlFinder', () => ({ CANCEL_POLL_MS: 50, uiaControlFinder: { find: vi.fn(), warmUp: vi.fn() } }))
vi.mock('../database/repositories/applicationsRepository', () => ({ getApplicationById: vi.fn() }))
vi.mock('../workflow/selfInjectedClicks', () => ({ markSelfInjectedClick: vi.fn() }))
// Only the Stop flag; the real executor would pull in the whole input stack.
vi.mock('./actionExecutor', () => ({ ACTION_CANCELLED_REASON: 'You stopped it', isCancelRequested: vi.fn(() => false) }))

const RESOLVE = { id: 'resolve', name: 'DaVinci Resolve', processName: 'Resolve.exe' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getApplicationById).mockReturnValue(RESOLVE)
  vi.mocked(processForWindow).mockReturnValue({ pid: 42, processName: 'Resolve.exe' })
  vi.mocked(isCancelRequested).mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('executeClick: the right app must be in front', () => {
  it('refuses, and clicks nothing, when a different app is in front', async () => {
    vi.mocked(processForWindow).mockReturnValue({ pid: 7, processName: 'chrome.exe' })
    const result = await executeClick('zone:3x3', 'resolve')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Expected DaVinci Resolve to be in front, but chrome.exe was')
    expect(SendInput).not.toHaveBeenCalled()
  })

  it('treats "Resolve" and "resolve.exe" as the same process', async () => {
    vi.mocked(processForWindow).mockReturnValue({ pid: 42, processName: 'resolve.EXE' })
    expect((await executeClick('zone:3x3', 'resolve')).ok).toBe(true)
  })

  it('still runs a click saved before steps recorded their app', async () => {
    vi.mocked(processForWindow).mockReturnValue({ pid: 7, processName: 'anything.exe' })
    expect((await executeClick('zone:3x3')).ok).toBe(true)
  })
})

describe('executeClick: a named control is found again, not guessed', () => {
  it('clicks the control where it is now', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'found', x: 812, y: 44 })
    const result = await executeClick('label:Blade', 'resolve')
    expect(result.ok).toBe(true)
    expect(uiaControlFinder.find).toHaveBeenCalledWith(42, 'Blade', isCancelRequested)
    expect(SetCursorPos).toHaveBeenCalledWith(812, 44)
  })

  it('refuses when several controls share the name', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'several', count: 2 })
    const result = await executeClick('label:Close', 'resolve')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Found 2 buttons named “Close”')
    expect(SendInput).not.toHaveBeenCalled()
  })

  it('refuses when something else is covering the control', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'found', x: 10, y: 10 })
    vi.mocked(WindowFromPoint).mockReturnValue(555)
    vi.mocked(processForWindow).mockImplementation((hwnd) =>
      hwnd === 555 ? { pid: 9, processName: 'Teams.exe' } : { pid: 42, processName: 'Resolve.exe' }
    )
    const result = await executeClick('label:Export', 'resolve')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('covering')
    expect(SendInput).not.toHaveBeenCalled()
  })

  it('waits for a control that is still appearing', async () => {
    vi.mocked(uiaControlFinder.find)
      .mockResolvedValueOnce({ status: 'none' })
      .mockResolvedValueOnce({ status: 'none' })
      .mockResolvedValue({ status: 'found', x: 5, y: 5 })
    vi.useFakeTimers()
    const pending = executeClick('label:Render', 'resolve')
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).ok).toBe(true)
    expect(uiaControlFinder.find).toHaveBeenCalledTimes(3)
  })

  it('gives up after a couple of seconds if it never appears', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'none' })
    vi.useFakeTimers()
    const pending = executeClick('label:Render', 'resolve')
    await vi.advanceTimersByTimeAsync(3000)
    const result = await pending
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("Couldn't find “Render”")
    expect(SendInput).not.toHaveBeenCalled()
  })
})

describe('executeClick: clicks like a hand, not a teleport', () => {
  it('moves onto the target before pressing, then presses and releases', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'found', x: 812, y: 44 })
    await executeClick('label:Edit', 'resolve')
    const calls = vi.mocked(SendInput).mock.calls.map((call) => (call[1] as Array<{ u: { mi: { dwFlags: number } } }>)[0].u.mi.dwFlags)
    const press = calls.indexOf(2)
    expect(press).toBeGreaterThan(0)
    // Every event before the press is a move, and the release follows it.
    expect(calls.slice(0, press).every((flags) => (flags & 1) === 1)).toBe(true)
    expect(calls[press + 1]).toBe(4)
  })
})

describe('executeClick: a position in a custom-drawn app', () => {
  it("maps the grid cell onto the window's current bounds", async () => {
    const result = await executeClick('zone:0x0')
    expect(result.ok).toBe(true)
    // 16x10 grid over 1600x1000: the centre of the top-left cell.
    expect(SetCursorPos).toHaveBeenCalledWith(50, 50)
  })

  it('refuses a cell outside the grid', async () => {
    expect((await executeClick('zone:40x2')).ok).toBe(false)
  })
})

describe('executeClick: Stop interrupts the wait for a control', () => {
  it('passes the Stop check into the search', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'found', x: 5, y: 5 })
    await executeClick('label:Render', 'resolve')
    expect(uiaControlFinder.find).toHaveBeenCalledWith(42, 'Render', isCancelRequested)
  })

  it('stops within ~50 ms while waiting between searches, and clicks nothing', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'none' })
    vi.useFakeTimers()
    let settled = false
    const pending = executeClick('label:Render', 'resolve').then((result) => {
      settled = true
      return result
    })
    await vi.advanceTimersByTimeAsync(10) // first search done, now waiting to retry
    vi.mocked(isCancelRequested).mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(50)
    expect(settled).toBe(true)
    expect(await pending).toEqual({ ok: false, reason: 'You stopped it' })
    expect(uiaControlFinder.find).toHaveBeenCalledTimes(1)
    expect(SendInput).not.toHaveBeenCalled()
  })

  it('stops when the search itself reports it was cancelled', async () => {
    vi.mocked(uiaControlFinder.find).mockResolvedValue({ status: 'cancelled' })
    const result = await executeClick('label:Render', 'resolve')
    expect(result).toEqual({ ok: false, reason: 'You stopped it' })
    expect(SendInput).not.toHaveBeenCalled()
  })

  it('does not click a control found after Stop was pressed', async () => {
    vi.mocked(uiaControlFinder.find).mockImplementation(async () => {
      vi.mocked(isCancelRequested).mockReturnValue(true)
      return { status: 'found', x: 5, y: 5 }
    })
    const result = await executeClick('label:Render', 'resolve')
    expect(result).toEqual({ ok: false, reason: 'You stopped it' })
    expect(SendInput).not.toHaveBeenCalled()
    expect(SetCursorPos).not.toHaveBeenCalled()
  })
})
