import { spawn } from 'child_process'

/**
 * Resolves a running process's main window handle by process name — the
 * lookup `focusApplication` (actionExecutor.ts) needs but the existing
 * foreground-window watcher (windowsAdapter.ts) can't give it: that watcher
 * only ever knows the *current* foreground process, never "is Application X
 * running somewhere, and if so, which window." Deliberately narrow and
 * read-only: it finds an existing window, it never starts a process — see
 * the `focusApplication` ControlAction's own doc comment in shared/types
 * for why that's a deliberate line, not a missing feature.
 *
 * Same "one-shot PowerShell helper" approach windowsAdapter.ts's polling
 * watcher already uses (no native module, no C++ toolchain — see that
 * file's doc comment), just a single query instead of a long-lived poll.
 */

/** Exe-name-shaped strings only — see `toPowerShellSingleQuotedLiteral`. */
const VALID_PROCESS_NAME = /^[A-Za-z0-9 _.-]{1,64}$/

/** Strips a trailing ".exe" (case-insensitive) if present, or returns the
 *  input unchanged — `Get-Process -Name` takes the bare process name, not
 *  the filename. Returns null (refuse, fail closed) for anything outside
 *  the closed character set a real Windows exe name uses — this string
 *  ends up inside a PowerShell command, so it's validated before it's ever
 *  allowed near one, the same "closed vocabulary, fail closed" posture
 *  systemCommands.ts and keyNames.ts already use for execution input. */
export function normalizeProcessNameForLookup(processName: string): string | null {
  if (!VALID_PROCESS_NAME.test(processName)) return null
  return processName.replace(/\.exe$/i, '')
}

/** A safe PowerShell single-quoted string literal for an already-validated
 *  bare name — doubling any embedded single quote is defense in depth on
 *  top of the regex above, not the only thing standing between this and
 *  injection. */
function toPowerShellSingleQuotedLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Finds the main window handle of a running process by name, or null if no
 * matching process has a visible main window (not running, or running with
 * no window yet — e.g. still starting up). Never throws; any failure
 * (invalid name, no PowerShell, nothing found) resolves to null so a caller
 * can fail closed exactly the way every other execution primitive here does.
 */
export function findMainWindowHandleForProcess(processName: string): Promise<number | null> {
  const bareName = normalizeProcessNameForLookup(processName)
  if (!bareName) return Promise.resolve(null)

  const script = `
    $proc = Get-Process -Name ${toPowerShellSingleQuotedLiteral(bareName)} -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowHandle -ne 0 } |
      Select-Object -First 1
    if ($proc) { Write-Output ([int64]$proc.MainWindowHandle) }
  `

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>
    try {
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      })
    } catch {
      resolve(null)
      return
    }

    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('close', () => {
      const trimmed = output.trim()
      const value = Number(trimmed)
      resolve(trimmed.length > 0 && Number.isFinite(value) && value !== 0 ? value : null)
    })
    child.on('error', () => resolve(null))
  })
}
