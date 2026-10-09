import { EventEmitter } from 'events'
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execFile, spawn } from 'child_process'
import { existsSync } from 'fs'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../database/db'
import { clearExpectedAppSwitches, consumeExpectedAppSwitch } from '../workflow/selfInjectedSwitches'
import { findMainWindowHandleForProcess } from './processWindow'
import { focusWindowAndVerify } from './windowFocus'
import { LAUNCH_UNSUPPORTED_REASON, launchApplicationById, launchCommandFor } from './launchApplication'

// Nothing in this suite may start a real process or touch a real window:
// spawn/execFile, the running-window lookup, focus, and the file check are
// all mocked, and the platform is switchable per test.
const platform = vi.hoisted(() => ({ isMac: false, isWindows: true }))
vi.mock('../platform', () => ({
  get isMac() {
    return platform.isMac
  },
  get isWindows() {
    return platform.isWindows
  }
}))
vi.mock('child_process', () => ({ spawn: vi.fn(), execFile: vi.fn() }))
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return { ...actual, existsSync: vi.fn() }
})
vi.mock('./processWindow', () => ({ findMainWindowHandleForProcess: vi.fn() }))
vi.mock('./windowFocus', () => ({ focusWindowAndVerify: vi.fn() }))

const WIN_PATH = 'C:\\Program Files\\Notepad++\\notepad++.exe'
const MAC_PATH = '/Applications/Notepad.app'

function insertApplication(id: string, name: string, processName: string, executablePath: string | null): void {
  getDatabase()
    .prepare('INSERT INTO applications (id, name, process_name, executable_path) VALUES (?, ?, ?, ?)')
    .run(id, name, processName, executablePath)
}

/** Makes spawn return a fake ChildProcess that reports `event` on the next
 *  tick after the call, the way the real one does. Returns that child. */
function spawnReports(event: 'spawn' | 'error', error?: Error): EventEmitter & { unref: () => void } {
  const child = Object.assign(new EventEmitter(), { unref: vi.fn() })
  vi.mocked(spawn).mockImplementation((() => {
    process.nextTick(() => (event === 'spawn' ? child.emit('spawn') : child.emit('error', error)))
    return child
  }) as never)
  return child
}

function useWindows(): void {
  platform.isMac = false
  platform.isWindows = true
}

function useMac(): void {
  platform.isMac = true
  platform.isWindows = false
}

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
  clearExpectedAppSwitches()
  useWindows()
  vi.mocked(spawn).mockReset()
  vi.mocked(execFile).mockReset()
  vi.mocked(existsSync).mockReset().mockReturnValue(true)
  vi.mocked(findMainWindowHandleForProcess).mockReset().mockResolvedValue(null)
  vi.mocked(focusWindowAndVerify).mockReset()
})

describe('launchCommandFor', () => {
  it('runs a Windows .exe directly with no arguments', () => {
    expect(launchCommandFor(WIN_PATH, 'win32')).toEqual({ file: WIN_PATH, args: [] })
  })

  it('refuses anything on Windows that would need a shell, or a relative path', () => {
    expect(launchCommandFor('C:\\tools\\run.bat', 'win32')).toBeNull()
    expect(launchCommandFor('C:\\tools\\run.cmd', 'win32')).toBeNull()
    expect(launchCommandFor('notepad.exe', 'win32')).toBeNull()
  })

  it('opens a macOS .app bundle with open, the bundle as its only argument', () => {
    expect(launchCommandFor(MAC_PATH, 'darwin')).toEqual({ file: 'open', args: [MAC_PATH] })
    expect(launchCommandFor(`${MAC_PATH}/`, 'darwin')).toEqual({ file: 'open', args: [MAC_PATH] })
  })

  it('refuses a macOS path that is not an .app bundle (open would hand it to its default handler)', () => {
    expect(launchCommandFor('/Users/me/run.command', 'darwin')).toBeNull()
    expect(launchCommandFor('/Applications/Notepad.app/Contents/MacOS/Notepad', 'darwin')).toBeNull()
    expect(launchCommandFor('Notepad.app', 'darwin')).toBeNull()
  })

  it('refuses every other platform', () => {
    expect(launchCommandFor('/usr/bin/gedit', 'linux')).toBeNull()
  })
})

describe('launchApplicationById', () => {
  it('fails closed for an unknown application without looking anything up', async () => {
    const result = await launchApplicationById('nope')
    expect(result).toEqual({ ok: false, reason: 'Unknown application, nothing to open' })
    expect(findMainWindowHandleForProcess).not.toHaveBeenCalled()
    expect(spawn).not.toHaveBeenCalled()
  })

  it('focuses the app instead of launching it when it is already running', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    vi.mocked(findMainWindowHandleForProcess).mockResolvedValue(4242)
    vi.mocked(focusWindowAndVerify).mockResolvedValue(true)

    expect(await launchApplicationById('npp')).toEqual({ ok: true })
    expect(findMainWindowHandleForProcess).toHaveBeenCalledWith('notepad++.exe')
    expect(focusWindowAndVerify).toHaveBeenCalledWith(4242)
    expect(spawn).not.toHaveBeenCalled()
    expect(consumeExpectedAppSwitch('npp')).toBe(true)
  })

  it('reports an unconfirmed focus rather than starting a second copy', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    vi.mocked(findMainWindowHandleForProcess).mockResolvedValue(4242)
    vi.mocked(focusWindowAndVerify).mockResolvedValue(false)

    const result = await launchApplicationById('npp')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('could not confirm focus')
    expect(spawn).not.toHaveBeenCalled()
  })

  it('fails closed when no executable path is on file yet', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', null)
    const result = await launchApplicationById('npp')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("doesn't know where Notepad++ is installed")
    expect(spawn).not.toHaveBeenCalled()
  })

  it('refuses a saved path that is not a launchable application', async () => {
    insertApplication('script', 'Script', 'cmd.exe', 'C:\\tools\\run.bat')
    const result = await launchApplicationById('script')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Refused')
    expect(existsSync).not.toHaveBeenCalled()
    expect(spawn).not.toHaveBeenCalled()
  })

  it('fails closed when the executable is no longer on disk', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    vi.mocked(existsSync).mockReturnValue(false)
    const result = await launchApplicationById('npp')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("isn't at its saved location anymore")
    expect(spawn).not.toHaveBeenCalled()
  })

  it('starts the Windows executable detached, with no shell and no arguments', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    const child = spawnReports('spawn')

    expect(await launchApplicationById('npp')).toEqual({ ok: true })
    expect(spawn).toHaveBeenCalledTimes(1)
    const [file, args, options] = vi.mocked(spawn).mock.calls[0] as unknown as [string, string[], Record<string, unknown>]
    expect(file).toBe(WIN_PATH)
    expect(args).toEqual([])
    expect(options).toMatchObject({ detached: true, shell: false, stdio: 'ignore' })
    expect(child.unref).toHaveBeenCalled()
    expect(execFile).not.toHaveBeenCalled()
    expect(consumeExpectedAppSwitch('npp')).toBe(true)
  })

  it('reports the OS refusing to start the process (spawn error event)', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    spawnReports('error', new Error('spawn EACCES'))

    expect(await launchApplicationById('npp')).toEqual({ ok: false, reason: 'Could not open Notepad++: spawn EACCES' })
  })

  it('reports spawn throwing synchronously', async () => {
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    vi.mocked(spawn).mockImplementation(() => {
      throw new Error('spawn EINVAL')
    })

    expect(await launchApplicationById('npp')).toEqual({ ok: false, reason: 'Could not open Notepad++: spawn EINVAL' })
  })

  it('opens a macOS bundle with open, never spawn', async () => {
    useMac()
    insertApplication('notepad', 'Notepad', 'Notepad', MAC_PATH)
    vi.mocked(execFile).mockImplementation(((_file: string, _args: string[], _options: unknown, callback: (e: Error | null, out: string, err: string) => void) => {
      callback(null, '', '')
    }) as never)

    expect(await launchApplicationById('notepad')).toEqual({ ok: true })
    expect(vi.mocked(execFile).mock.calls[0].slice(0, 2)).toEqual(['open', [MAC_PATH]])
    expect(spawn).not.toHaveBeenCalled()
  })

  it('reports open failing on macOS, using its stderr', async () => {
    useMac()
    insertApplication('notepad', 'Notepad', 'Notepad', MAC_PATH)
    vi.mocked(execFile).mockImplementation(((_file: string, _args: string[], _options: unknown, callback: (e: Error | null, out: string, err: string) => void) => {
      callback(new Error('exit 1'), '', 'The application cannot be opened.\n')
    }) as never)

    expect(await launchApplicationById('notepad')).toEqual({
      ok: false,
      reason: 'Could not open Notepad: The application cannot be opened.'
    })
  })

  it('refuses on a platform it does not support', async () => {
    platform.isMac = false
    platform.isWindows = false
    insertApplication('npp', 'Notepad++', 'notepad++.exe', WIN_PATH)
    expect(await launchApplicationById('npp')).toEqual({ ok: false, reason: LAUNCH_UNSUPPORTED_REASON })
    expect(spawn).not.toHaveBeenCalled()
  })
})
