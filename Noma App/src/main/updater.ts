import { app, Notification, shell } from 'electron'
import { execFile } from 'child_process'
import { dirname } from 'path'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { isMac } from './platform'

/** Where pilot builds are published (electron-builder.yml's `publish`). */
const RELEASES_URL = 'https://github.com/awnsh/Noma/releases/latest'
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

let status: UpdateStatus = {
  phase: 'unavailable',
  currentVersion: app.getVersion(),
  version: null,
  percent: null,
  lastCheckedAt: null
}
const listeners = new Set<(status: UpdateStatus) => void>()
/** Resolves once the updater is configured; null when updates don't apply. */
let ready: Promise<void> | null = null
/** A check already running, so a click during the background check joins it. */
let inFlight: Promise<void> | null = null

function setStatus(update: Partial<UpdateStatus>): void {
  status = { ...status, ...update }
  for (const listener of listeners) listener(status)
}

/** Phases past the point a new check can change anything. */
function foundUpdate(): boolean {
  return status.phase === 'downloading' || status.phase === 'ready' || status.phase === 'available'
}

/**
 * Keeps installed pilot/beta copies up to date from GitHub Releases, which
 * CI fills for Windows and macOS from the same tag (see RELEASING.md).
 *
 * Windows: downloads in the background and installs when Noma quits (or
 * right away from the tray's "Restart to update" or Settings).
 *
 * macOS: only an app signed with an Apple Developer ID can replace itself
 * macOS refuses a self-update of an ad-hoc signed build. So an unsigned
 * build doesn't download anything; it shows a notification that opens the
 * download page instead. Once the Mac build is signed (see RELEASING.md),
 * it updates itself exactly like Windows, with no code change.
 *
 * Never runs in development or against the isolated test profile.
 */
export function startAutoUpdates(onReadyToInstall: (version: string) => void): void {
  if (!app.isPackaged || process.env.NOMA_TEST_USER_DATA_DIR) return
  setStatus({ phase: 'idle' })

  ready = canSelfUpdate().then((selfUpdate) => {
    autoUpdater.autoDownload = selfUpdate
    autoUpdater.autoInstallOnAppQuit = selfUpdate
    // Background failures (offline, GitHub rate limit) are retried at the
    // next check and never shown; checkNow() reports its own.
    autoUpdater.on('error', () => {
      if (status.phase === 'downloading') setStatus({ phase: 'idle', percent: null })
    })
    autoUpdater.on('update-not-available', () => {
      if (!foundUpdate()) setStatus({ phase: 'up-to-date', version: null })
    })

    if (selfUpdate) {
      autoUpdater.on('update-available', (info) => {
        setStatus({ phase: 'downloading', version: info.version, percent: 0 })
      })
      autoUpdater.on('download-progress', (progress) => {
        setStatus({ phase: 'downloading', percent: Math.round(progress.percent) })
      })
      autoUpdater.on('update-downloaded', (info) => {
        setStatus({ phase: 'ready', version: info.version, percent: null })
        onReadyToInstall(info.version)
        notify(`Noma ${info.version} is ready`, 'It installs the next time Noma quits, or now from the tray menu.')
      })
    } else {
      let announced: string | null = null
      autoUpdater.on('update-available', (info) => {
        setStatus({ phase: 'available', version: info.version })
        if (announced === info.version) return
        announced = info.version
        notify(`Noma ${info.version} is available`, 'Click to download the new version.', () => openDownloadPage())
      })
    }

    const check = (): void => {
      void runCheck().catch(() => {})
    }
    check()
    setInterval(check, CHECK_INTERVAL_MS)
  })
}

function runCheck(): Promise<void> {
  if (!inFlight) {
    if (!foundUpdate()) setStatus({ phase: 'checking' })
    inFlight = autoUpdater
      .checkForUpdates()
      .then(() => undefined)
      .finally(() => {
        inFlight = null
        setStatus({ lastCheckedAt: Date.now() })
      })
  }
  return inFlight
}

/** Settings' "Check for updates". Unlike the background check, a failure
 *  here is shown, since the user is waiting on the answer. */
export async function checkForUpdatesNow(): Promise<UpdateStatus> {
  if (!ready) return status
  await ready
  // Already found one: checking again would only restart the download.
  if (foundUpdate()) return status
  try {
    await runCheck()
    // checkForUpdates resolves before the update-available / not-available
    // events in some electron-updater paths; never leave the button spinning.
    if (status.phase === 'checking') setStatus({ phase: 'up-to-date' })
  } catch {
    if (!foundUpdate()) setStatus({ phase: 'error' })
  }
  return status
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function onUpdateStatus(listener: (status: UpdateStatus) => void): void {
  listeners.add(listener)
}

/** Quits and installs a downloaded update. */
export function installUpdateNow(): void {
  if (status.phase === 'ready') autoUpdater.quitAndInstall()
}

export function openDownloadPage(): void {
  void shell.openExternal(RELEASES_URL)
}

/** Windows always can; macOS only when the app carries a Developer ID
 *  signature (an ad-hoc signed app can't replace itself there). */
function canSelfUpdate(): Promise<boolean> {
  if (!isMac) return Promise.resolve(true)
  // .../Noma.app/Contents/MacOS/Noma -> .../Noma.app
  const bundle = dirname(dirname(dirname(process.execPath)))
  return new Promise((resolve) => {
    execFile('codesign', ['-dv', '--verbose=2', bundle], { timeout: 5000 }, (_error, stdout, stderr) => {
      resolve(`${stdout}${stderr}`.includes('Authority=Developer ID Application'))
    })
  })
}

function notify(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body, silent: true })
  if (onClick) notification.on('click', onClick)
  notification.show()
}
