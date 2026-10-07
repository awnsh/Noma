import { app, type BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import type { ApplicationContext, GlideState } from '@shared/types'
import { frontWindowOwnerPid, frontmostPid, isAccessibilityTrusted, pointerPosition, processNameForPid } from './actions/macos'
import { macTrackpadStatus } from './holo/macTrackpad'
import { getApplicationIcon } from './applications/iconService'
import { isMac } from './platform'
import { sleep } from './util'

/**
 * Launch check for CI (`NOMA_SMOKE_TEST=<report path>`, only honoured
 * together with NOMA_TEST_USER_DATA_DIR so it can never run against a real
 * profile). Lets a runner prove a packaged build actually starts on its OS,
 * which typechecking and unit tests can't: the macOS native calls (koffi
 * signatures, the JXA app watcher, MultitouchSupport) only run for real in a
 * real app. A wrong FFI signature crashes the process, so a missing report
 * is itself the failure signal.
 *
 * Waits for the window to load and for the app watcher's first answer,
 * turns Glide on (a runner has no trackpad, so this must fail politely),
 * writes what it saw and quits.
 */
export function runSmokeTest(options: {
  reportPath: string
  window: BrowserWindow
  getContext: () => ApplicationContext
  enableGlide: () => GlideState
}): void {
  const report: Record<string, unknown> = { platform: process.platform, arch: process.arch, version: app.getVersion() }
  const finish = (ok: boolean, error?: unknown): void => {
    report.ok = ok
    if (error) report.error = String(error instanceof Error ? (error.stack ?? error.message) : error)
    writeFileSync(options.reportPath, JSON.stringify(report, null, 2))
    app.exit(ok ? 0 : 1)
  }
  const timeout = setTimeout(() => finish(false, 'timed out waiting for the window to load'), 60_000)

  const check = async (): Promise<void> => {
    report.rendererLoaded = true
    report.rendererTitle = await options.window.webContents.executeJavaScript('document.title')
    report.rootRendered = await options.window.webContents.executeJavaScript(
      "document.getElementById('root')?.childElementCount > 0"
    )
    // The app watcher polls; give it a few seconds to report the first app.
    const started = Date.now()
    while (!options.getContext().application && Date.now() - started < 10_000) {
      await sleep(250)
    }
    report.application = options.getContext().application?.id ?? null
    report.glide = options.enableGlide()
    if (isMac) {
      const pid = frontmostPid()
      report.mac = {
        accessibilityTrusted: isAccessibilityTrusted(),
        frontmostPid: pid,
        // The window-server fallback for focus checks (macos.ts); a wrong
        // signature here would crash, which is the point of calling it.
        frontWindowOwnerPid: frontWindowOwnerPid(),
        frontmostProcess: pid === null ? null : processNameForPid(pid),
        pointer: pointerPosition(),
        multitouch: macTrackpadStatus(),
        // An app icon, read the way the Glide page and Flow do: this is
        // what crashed the app on macOS 26 when it used app.getFileIcon.
        icon: (await getApplicationIcon('/System/Applications/Calculator.app'))?.slice(0, 40) ?? null
      }
    }
    clearTimeout(timeout)
    const mac = report.mac as
      | { pointer: unknown; multitouch: { error: string | null }; icon: string | null }
      | undefined
    // The pointer needs no permission, so null means macos.ts failed to load.
    const nativeOk = !mac || (mac.pointer !== null && mac.multitouch.error === null && mac.icon !== null)
    finish(report.rootRendered === true && nativeOk)
  }

  const run = (): void => {
    check().catch((error) => finish(false, error))
  }
  if (options.window.webContents.isLoading()) options.window.webContents.once('did-finish-load', run)
  else run()
}
