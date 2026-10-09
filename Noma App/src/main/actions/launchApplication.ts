import { execFile, spawn } from 'child_process'
import { existsSync } from 'fs'
import { win32 } from 'path'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import { isMac, isWindows } from '../platform'
import { markExpectedAppSwitch } from '../workflow/selfInjectedSwitches'
import { findMainWindowHandleForProcess } from './processWindow'
import { focusWindowAndVerify } from './windowFocus'
import type { ExecutionResult } from './actionExecutor'

/**
 * Opens an application by id: the `launchApplication` ControlAction/
 * MacroStep (see shared/types). If the app is already running it is
 * focused instead, through the exact same findMainWindowHandleForProcess +
 * focusWindowAndVerify (SetForegroundWindow and verify) path
 * `focusApplication` uses, so a press never starts a second copy of
 * something that's already open.
 *
 * What gets started is never built from input: the only thing launched is
 * the `executablePath` Noma itself recorded for this application id when
 * it saw the app running (windowsAdapter.ts: the process's .exe; macAdapter.ts:
 * the .app bundle). No shell, no arguments, no URL or document handed to
 * an opener. A seeded application Noma has never seen running has no path
 * on file yet, and that's refused rather than guessed.
 *
 * Fails closed at every step, each with a reason the user can act on:
 * unknown application, no path on file, a path that isn't an app, a path
 * that no longer exists, focus not confirmed, or the OS refusing to start it.
 */

/** How long a launched app's first arrival in front is treated as Noma's
 *  own switch (selfInjectedSwitches.ts). Cold starts are slow. */
const LAUNCH_SWITCH_TTL_MS = 15000

/** Seen when the launch itself didn't happen, so the reason says why. */
export const LAUNCH_UNSUPPORTED_REASON = 'Opening applications is only supported on Windows and macOS'

/**
 * The exact program + arguments used to start `executablePath`, or null
 * if that path isn't something this is willing to start on `platform`.
 * Pure and exported so the "what would actually be run" decision is
 * unit-testable without spawning anything.
 *
 * Windows: the .exe itself, no arguments. Only `.exe`: a `.bat`/`.cmd`
 * would need a shell to run at all, and a shell is exactly what this
 * refuses to involve.
 *
 * macOS: `open <bundle>.app`. Only `.app` bundles: `open` on any other
 * path opens it with that file's default handler (a `.command` file runs
 * in Terminal), which is not "launch this application".
 */
export function launchCommandFor(
  executablePath: string,
  platform: NodeJS.Platform
): { file: string; args: string[] } | null {
  if (platform === 'win32') {
    // win32 path rules explicitly, so this answers the same on any host.
    if (!win32.isAbsolute(executablePath) || !/\.exe$/i.test(executablePath)) return null
    return { file: executablePath, args: [] }
  }
  if (platform === 'darwin') {
    const bundle = executablePath.replace(/\/+$/, '')
    if (!bundle.startsWith('/') || !/\.app$/i.test(bundle)) return null
    return { file: 'open', args: [bundle] }
  }
  return null
}

/** Starts a Windows .exe detached from Noma (it keeps running if Noma
 *  quits), resolving once the OS has actually created the process or
 *  refused to: spawn reports ENOENT/EACCES asynchronously, through
 *  'error', so returning right after the call would report success for a
 *  launch that never happened. */
function spawnDetached(file: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(file, args, {
        cwd: win32.dirname(file),
        detached: true,
        shell: false,
        stdio: 'ignore',
        windowsHide: false
      })
    } catch (error) {
      resolve(error instanceof Error ? error.message : String(error))
      return
    }
    child.once('error', (error) => resolve(error.message))
    child.once('spawn', () => {
      child.unref()
      resolve(null)
    })
  })
}

/** macOS: `open` hands the bundle to LaunchServices and exits once it's
 *  been launched (or refused), so its exit status is the answer. */
function openOnMac(file: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: 15000 }, (error, _stdout, stderr) => {
      resolve(error ? String(stderr).trim() || error.message : null)
    })
  })
}

export async function launchApplicationById(applicationId: string): Promise<ExecutionResult> {
  const application = getApplicationById(applicationId)
  if (!application) {
    return { ok: false, reason: 'Unknown application, nothing to open' }
  }

  // Already running: switch to it rather than starting another copy. A
  // failed focus is reported as-is, not "fixed" by launching a second one.
  const hwnd = await findMainWindowHandleForProcess(application.processName)
  if (hwnd !== null) {
    // Noma's own switch, not the user's: see selfInjectedSwitches.ts.
    markExpectedAppSwitch(applicationId)
    return (await focusWindowAndVerify(hwnd))
      ? { ok: true }
      : { ok: false, reason: `${application.name} is already open, but Noma could not confirm focus on it` }
  }

  if (!isWindows && !isMac) return { ok: false, reason: LAUNCH_UNSUPPORTED_REASON }

  if (!application.executablePath) {
    return {
      ok: false,
      reason: `Noma doesn't know where ${application.name} is installed yet. Open it once yourself so Noma can see it, then try again`
    }
  }

  const command = launchCommandFor(application.executablePath, isMac ? 'darwin' : 'win32')
  if (!command) {
    return { ok: false, reason: `Refused: ${application.name}'s saved location isn't an application Noma can open` }
  }

  if (!existsSync(application.executablePath)) {
    return {
      ok: false,
      reason: `${application.name} isn't at its saved location anymore (it may have been moved or uninstalled). Open it once yourself so Noma can find it again`
    }
  }

  // A freshly started app comes to the front on its own once it's up,
  // which can take far longer than a focus does: marked with a longer
  // window so that arrival isn't learned as the user switching to it.
  markExpectedAppSwitch(applicationId, LAUNCH_SWITCH_TTL_MS)
  const failure = isMac
    ? await openOnMac(command.file, command.args)
    : await spawnDetached(command.file, command.args)
  return failure === null
    ? { ok: true }
    : { ok: false, reason: `Could not open ${application.name}: ${failure}` }
}
