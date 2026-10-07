import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, systemPreferences } from 'electron'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { optimizer, is } from '@electron-toolkit/utils'

/**
 * Isolated test profile; set NOMA_TEST_USER_DATA_DIR to point Electron's
 * userData (and therefore db.ts's noma.db) at a throwaway directory instead
 * of the real, actively-used profile.
 *
 * This exists because of a real incident: automated testing launched the
 * raw built binary directly, which defaulted to the same userData path the
 * developer's actual daily-use Noma installation uses, and ended up
 * overwriting two real control slots with demo data before anyone noticed.
 * That should be structurally impossible, not something a future session
 * has to remember not to do; hence a hard switch, checked before anything
 * else in this file touches `app`, rather than a convention documented
 * somewhere and hoped for.
 *
 * Must run before `initDatabase()` (db.ts reads `app.getPath('userData')`
 * the moment it's called) and before anything else that could touch real
 * user state; so this sits at the very top of the file, ahead of every
 * other import's side effects that might run first.
 */
const TEST_USER_DATA_DIR = process.env.NOMA_TEST_USER_DATA_DIR
if (TEST_USER_DATA_DIR) {
  app.setPath('userData', TEST_USER_DATA_DIR)
  // eslint-disable-next-line no-console
  console.log(`[TEST MODE] userData redirected to: ${TEST_USER_DATA_DIR}`)
  // The website's notice capture (captureNotice.ts) reads a transparent
  // window back as an image, which GPU compositing refuses on Windows
  // (UnknownVizError); software rendering draws the same pixels.
  if (process.env.NOMA_CAPTURE_NOTICE) app.disableHardwareAcceleration()
}
import icon from '../../resources/icon.png?asset'
import iconIco from '../../resources/icon.ico?asset'
import iconMac from '../../resources/icon-mac.png?asset'
// The website favicon's 32px artwork, whose strokes are drawn heavier to
// stay legible at tray size (downscaling the big icon makes them too thin).
import trayIconPath from '../../resources/tray.png?asset'
// macOS menu bar: black-on-alpha template image (the OS tints it for light/dark).
import trayTemplatePath from '../../resources/trayIconTemplate.png?asset'
import trayTemplate2xPath from '../../resources/trayIconTemplate@2x.png?asset'
import { APP_DISPLAY_NAME, IPC_CHANNELS, ISSUE_PAGE_URL } from '@shared/constants'
import { buildDiagnosticsReport } from './diagnostics'
import type { HoloTrackpadZoneCount } from '@shared/types'
import { initDatabase } from './database/db'
import { registerIpcHandlers } from './ipc/handlers'
import { createOSAdapter } from './os/createOSAdapter'
import { isMac, isWindows } from './platform'
import { platformIcon } from './platformIcon'
import { runSmokeTest } from './smokeTest'
import { captureNotice } from './captureNotice'
import { captureApp } from './captureApp'
import {
  checkForUpdatesNow,
  getUpdateStatus,
  installUpdateNow,
  onUpdateStatus,
  openDownloadPage,
  startAutoUpdates
} from './updater'
import { getWhatsNew, initWhatsNew, markWhatsNewSeen } from './whatsNew'
import { ApplicationContextService } from './applications/contextService'
import { getDefaultHardwareDevice } from './hardware/virtualDevice'
import { DeviceTransportServer } from './hardware/deviceTransportServer'
import { CaptureService } from './workflow/captureService'
import { ClickCaptureService } from './workflow/clickCaptureService'
import { createClickInspector } from './workflow/uiaInspector'
import { GlideController } from './holo/glideController'
import { getMacEdgeSwipe, setMacEdgeSwipe } from './holo/macEdgeSwipe'
import { latestTouchCheckAt, openRecordingsFolder } from './holo/recordingStore'
import { insertWorkflowEvent } from './database/repositories/workflowEventsRepository'
import { getClickCaptureEnabled, getWorkflowMonitoringEnabled } from './database/repositories/settingsRepository'
import { getSuggestionHistoryForKind, getPendingSuggestions } from './database/repositories/suggestionsRepository'
import { markDemoSuggestions, simulateDemoMultiStepWorkflow } from './demo/demoService'
import { getApplicationById } from './database/repositories/applicationsRepository'
import { LocalRuleBasedProvider } from './ai/localProvider'
import { SuggestionEngine } from './ai/suggestionEngine'
import {
  cancelRunningAction,
  executeControlActionExclusively,
  getActionRunState,
  isActionRunning,
  onActionRunState
} from './actions/actionExecutor'
import { WorkflowNotifier } from './notifications/workflowNotifier'
import {
  closeWorkflowNoticeWindow,
  getPendingWorkflowNotice,
  setWorkflowNoticeInteractive
} from './notifications/notificationWindow'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
/** False until a real quit is underway (tray "Quit Noma", OS shutdown, or
 *  Cmd+Q); while false, the window's own close button hides it instead of
 *  exiting the app. See `createTray` and `createMainWindow`'s `close`
 *  handler. */
let isQuitting = false
/** The last application a genuine appSwitch WorkflowEvent was recorded for
 *  (see contextService.onContextChanged below); distinct from
 *  contextService's own `current`, which also updates for reasons that
 *  aren't a real switch (a control reassignment's same-app context
 *  refresh, Demo Mode handing control back to the real OS adapter). Lets
 *  that listener record one row per genuine switch, not one per emission. */
let lastRecordedApplicationId: string | null = null

const osAdapter = createOSAdapter()
const contextService = new ApplicationContextService(osAdapter)
const hardwareDevice = getDefaultHardwareDevice()

/** Glide, the trackpad swipe-in (see holo/glideController.ts). Its on/off
 *  switch is stored in settings and it presses controls from here, so it
 *  works with Noma's window closed to the tray. */
const glide = new GlideController({
  runningMarkerPath: join(app.getPath('userData'), 'glide-running'),
  getWindow: () => mainWindow,
  getContext: () => contextService.getContext(),
  isNomaFocused: () => Boolean(mainWindow?.isVisible() && mainWindow.isFocused()),
  isActionRunning,
  press: (control) => hardwareDevice.pressControl(control.id),
  emitState: (state) => {
    mainWindow?.webContents.send(IPC_CHANNELS.GLIDE_STATE_CHANGED, state)
    updateTrayMenu()
  },
  emitActivity: (activity) => mainWindow?.webContents.send(IPC_CHANNELS.GLIDE_ACTIVITY, activity)
})
const deviceTransportServer = new DeviceTransportServer(hardwareDevice)
const aiProvider = new LocalRuleBasedProvider(
  getSuggestionHistoryForKind,
  (applicationId) => getApplicationById(applicationId)?.name ?? null
)
const suggestionEngine = new SuggestionEngine(aiProvider)

/**
 * Noma Notice. Nothing about detection changed to add this: the notifier
 * only reads the suggestions the engine already produced and decides whether
 * one of them has been seen often enough to be worth saying out loud while
 * the user is working somewhere else.
 */
const workflowNotifier = new WorkflowNotifier(() => {
  mainWindow?.webContents.send(IPC_CHANNELS.SUGGESTIONS_CHANGED, getPendingSuggestions())
})

/** Re-runs pattern detection -> suggestion generation, then pushes the
 *  (possibly updated) pending list to the renderer. Called after every
 *  captured workflow event: see docs/architecture.md's learning loop. */
async function refreshSuggestions(): Promise<void> {
  const patterns = await suggestionEngine.refresh()
  mainWindow?.webContents.send(IPC_CHANNELS.SUGGESTIONS_CHANGED, getPendingSuggestions())
  // Reuses the patterns that pass already detected rather than running
  // detection again; and runs after the push, so the app is never showing
  // a stale list behind a notice that's already on screen.
  workflowNotifier.review(patterns)
}

const captureService = new CaptureService((event) => {
  insertWorkflowEvent({
    applicationId: event.applicationId,
    eventType: 'shortcut',
    comboKeys: event.comboKeys,
    timestamp: event.timestamp
  })
  void refreshSuggestions()
  // Improved Virtual Keyboard: let the decorative layout flash the real
  // keys of this real captured combo. Nothing new is exposed here: this
  // is exactly the already-sanitized combo insertWorkflowEvent // persisted, not a raw keystroke.
  mainWindow?.webContents.send(IPC_CHANNELS.WORKFLOW_COMBO_CAPTURED, event.comboKeys)
})

/** Opt-in (settingsRepository's clickCaptureEnabled, off by default) and only
 *  ever engaged alongside workflow monitoring: records which on-screen
 *  control was clicked, sanitized to a label or a coarse window zone: see
 *  workflow/clickTarget.ts and docs/privacy-and-legal.md. */
const clickCaptureService = new ClickCaptureService((event) => {
  insertWorkflowEvent({
    applicationId: event.applicationId,
    eventType: 'click',
    clickTarget: event.clickTarget,
    timestamp: event.timestamp
  })
  void refreshSuggestions()
}, createClickInspector())

/**
 * A control usually fires while the user is in some other app (that's the
 * point of a physical key or a Holo tap), where the in-app "✗ failed" line
 * on the Virtual Keyboard page is invisible. A workflow that stops partway
 * without saying so leaves the user not knowing what did and didn't
 * happen, so a failure there gets a Windows notification instead. Only when
 * Noma's own window isn't the one being looked at, and only for failures:
 * a success is already visible in whatever the action did.
 */
/**
 * A local record of what each control press did: the control's label, its
 * action type, whether it worked and, if not, the step and reason it stopped
 * at. For diagnosing replay ("it stops at Select all, sometimes") from what
 * actually happened rather than from memory. Never what was typed or
 * clicked on, and never leaves this computer; trimmed to the last ~500
 * presses. %APPDATA%/noma/logs/actions.jsonl.
 */
function logActionResult(controlLabel: string, actionType: string, result: { ok: boolean; reason?: string }): void {
  try {
    const folder = join(app.getPath('userData'), 'logs')
    mkdirSync(folder, { recursive: true })
    const file = join(folder, 'actions.jsonl')
    const line = JSON.stringify({ at: new Date().toISOString(), control: controlLabel, actionType, ok: result.ok, reason: result.reason })
    const previous = existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).slice(-499) : []
    writeFileSync(file, [...previous, line, ''].join('\n'))
  } catch {
    // Diagnostics only: never let logging break a press.
  }
}

function notifyActionFailed(controlLabel: string, reason: string | undefined): void {
  if (mainWindow?.isVisible() && mainWindow.isFocused()) return
  if (!Notification.isSupported()) return
  new Notification({
    title: `Noma couldn't finish “${controlLabel}”`,
    body: reason ?? 'The action failed.',
    // Without one, Windows shows the Electron icon in development.
    icon: nativeImage.createFromPath(icon),
    silent: true
  }).show()
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08080a',
    title: TEST_USER_DATA_DIR ? `${APP_DISPLAY_NAME}. TEST PROFILE` : APP_DISPLAY_NAME,
    // Windows/Linux taskbar + window icon. macOS instead uses the app
    // bundle's icon (set at packaging time), which doesn't exist yet: see
    // "Prepare for STM32"/packaging notes; this only affects the
    // dev/unpackaged window on this machine.
    // .ico on Windows: the format the taskbar actually uses (a 1254 px PNG
    // has to be scaled on the fly and isn't always picked up).
    icon: platformIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Explicit, not relied-on-as-default: no Node access in the
      // renderer, isolated from the preload's JS context, and Chromium's
      // OS-level sandbox enabled. See docs/security-review.md.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Holo listens for taps while the user works in *other* apps, with
      // this window minimized or hidden. Chromium otherwise throttles
      // timers in a hidden window to ~1/s, which would drop or delay taps.
      backgroundThrottling: false
    }
  })

  // The taskbar button's icon. Windows only honours a window's own relaunch
  // icon when the window also has a relaunch command (and display name);
  // without one it silently ignores the icon and looks the app ID up in the
  // Start Menu instead, which in development raced with the shortcut being
  // written and often came back with electron.exe's icon. With all three
  // set, the button is Noma's no matter what the shortcut lookup finds.
  if (isWindows) {
    mainWindow.setAppDetails({
      appId: APP_USER_MODEL_ID,
      appIconPath: iconIco,
      appIconIndex: 0,
      relaunchCommand: relaunchCommand(),
      relaunchDisplayName: 'Noma'
    })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // The renderer's own <title>Noma</title> would otherwise overwrite the
  // constructor's `title` option the instant the page loads: this is the
  // one place that's allowed to win, so "Noma Beta" (and "TEST PROFILE")
  // actually stay visible rather than flashing briefly on launch.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  // Noma is meant to run in the background (see PRODUCT.md's "infrastructure
  // that is always present," and Flow/Holo both keep working with no window
  // open at all). The minimize button and the close button both hide the
  // window instead of minimizing/quitting; reopening happens from the tray
  // icon's "Open Noma" (or a click on the icon itself), same as any other
  // background-utility app. A real quit only happens via the tray's "Quit
  // Noma" or the OS shutting the app down, both of which set `isQuitting`
  // first.
  // 'minimize' itself isn't cancelable (no `event` to preventDefault: see
  // Electron's typings), so this rides along right after: the taskbar entry
  // blinks for an instant, then `hide()` removes it entirely and the window
  // is reachable only from the tray from here on.
  mainWindow.on('minimize', () => {
    mainWindow?.hide()
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    // The notice window is hidden rather than closed between notices, so it
    // would otherwise still be in getAllWindows() here. 'window-all-closed'
    // would never fire and Noma would linger invisibly after a real quit.
    // Only reached now once `isQuitting` is true (see the `close` handler
    // above): an ordinary close hides the window instead of destroying it.
    closeWorkflowNoticeWindow()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Un-hides the main window, creating it first if it was never opened this
 *  run: the one path both the tray icon and Noma Notice's "Review" use. */
function showMainWindow(): void {
  if (!mainWindow) createMainWindow()
  mainWindow?.show()
  mainWindow?.focus()
}

/**
 * The reopen path for a minimized/closed Noma: see the `minimize`/`close`
 * handlers above. A left-click toggles (matches most Windows tray icons:
 * Discord, Slack); the context menu (right-click, or Electron's own
 * left-click fallback on Linux) spells the same action out in words, plus
 * the only real way left to quit the app.
 */
function createTray(): void {
  let trayIcon: Electron.NativeImage
  if (process.platform === 'darwin') {
    // ?asset renames files, so the @2x sibling isn't auto-discovered: add it explicitly.
    trayIcon = nativeImage.createFromPath(trayTemplatePath)
    trayIcon.addRepresentation({ scaleFactor: 2, buffer: readFileSync(trayTemplate2xPath) })
    trayIcon.setTemplateImage(true)
  } else {
    trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 })
  }
  tray = new Tray(trayIcon)
  tray.setToolTip(
    TEST_USER_DATA_DIR
      ? `${APP_DISPLAY_NAME} (TEST PROFILE), running in the background`
      : `${APP_DISPLAY_NAME}, running in the background`
  )
  updateTrayMenu()
  tray.on('click', () => {
    if (mainWindow?.isVisible()) mainWindow.hide()
    else showMainWindow()
  })
}

/** Set once an update has downloaded (updater.ts). */
let readyUpdateVersion: string | null = null

/** The tray menu: open, Glide on/off (reachable from any app, so Glide can
 *  always be switched off at once), Stop while an action is running, and
 *  "Restart to update" once an update has downloaded. */
function updateTrayMenu(): void {
  if (!tray) return
  const glideState = glide.getState()
  const running = getActionRunState()
  tray.setContextMenu(
    Menu.buildFromTemplate([
      // Version line first, so the tray also says this is a beta build.
      { label: `${APP_DISPLAY_NAME} ${app.getVersion()}`, enabled: false },
      { type: 'separator' },
      { label: 'Open Noma', click: () => showMainWindow() },
      { type: 'separator' },
      ...(glideState.platformSupported
        ? [
            {
              label: 'Glide',
              type: 'checkbox' as const,
              checked: glideState.enabled,
              click: () => glide.setEnabled(!glide.getState().enabled)
            }
          ]
        : []),
      ...(running.running
        ? [{ label: `Stop “${running.label ?? 'action'}”`, click: () => cancelRunningAction() }]
        : []),
      ...(readyUpdateVersion
        ? [{ label: `Restart to update to ${readyUpdateVersion}`, click: () => installUpdateNow() }]
        : []),
      { type: 'separator' },
      // Flips `isQuitting` via the app-wide `before-quit` listener, not
      // here directly: the same flag has to be true for an OS shutdown or
      // Cmd+Q to actually exit too, not this menu item.
      { label: 'Quit Noma', click: () => app.quit() }
    ])
  )
}

/**
 * macOS gates everything Noma does with other apps (seeing shortcuts,
 * sending them, clicking, focusing a window) behind Accessibility
 * permission. Asking here shows the system prompt that opens the right
 * Settings pane; until it's granted, actions fail closed with a reason
 * rather than doing anything unexpected. Detecting the frontmost app needs
 * no permission, so context switching works either way.
 */
function requestMacAccessibility(): void {
  if (!isMac || TEST_USER_DATA_DIR) return
  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    systemPreferences.isTrustedAccessibilityClient(true)
  }
}

/**
 * The ID Windows knows this app by: what its taskbar button groups under,
 * and whose name and icon its notifications carry. The installed build gets
 * `com.noma.app` from its installer's Start Menu shortcut. Development runs
 * electron.exe, and electron-toolkit's default there (the exe's own path)
 * made Windows show "Electron" and Electron's icon on the taskbar and on
 * every notification. A separate ID keeps a dev copy from ever being
 * mistaken for an installed one.
 */
const APP_USER_MODEL_ID = is.dev ? 'com.noma.app.dev' : 'com.noma.app'

/** How Windows would start this app again (pinning, the taskbar's own
 *  relaunch): the installed exe, or in development electron.exe on this
 *  checkout. */
function relaunchCommand(): string {
  return is.dev ? `"${process.execPath}" "${app.getAppPath()}"` : `"${process.execPath}"`
}

/**
 * Noma's notification ID on Windows. Electron otherwise invents a random one
 * every run, and writes it into its Start Menu shortcut (below), so the
 * shortcut changed on every launch. Fixed, it is written once.
 */
const TOAST_ACTIVATOR_CLSID = '{626CBF99-529D-4081-8378-0FC2340DD9A4}'

/**
 * Windows takes an app's name and icon from the Start Menu shortcut that
 * carries its app ID. Electron manages that shortcut itself, for
 * notifications: one file named after the running program (Noma.lnk when
 * installed, Electron.lnk when run from source), which it rewrites whenever
 * its target, working folder, app ID or notification ID differ, and always
 * without an icon, so Windows falls back to the exe's. Installed, that's
 * Noma.exe's own icon, so all is well. From source it's electron.exe's, and
 * that's the icon the taskbar kept switching back to.
 *
 * So in development Noma writes Electron's shortcut itself, with exactly the
 * values Electron checks plus the Noma icon. Electron then finds it valid and
 * leaves it alone. Written only when something differs.
 */
function registerAppIdentity(): void {
  // Windows-only Electron APIs: on macOS setToastActivatorCLSID doesn't
  // exist, and calling it threw before Noma's window or tray was created.
  if (!isWindows) return
  app.setToastActivatorCLSID(TOAST_ACTIVATOR_CLSID)
  app.setAppUserModelId(APP_USER_MODEL_ID)
  if (!is.dev) return

  const programs = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  const shortcut = join(programs, 'Electron.lnk')
  const wanted: Electron.ShortcutDetails = {
    target: process.execPath,
    args: `"${app.getAppPath()}"`,
    // What Electron checks the working folder against: the exe's own.
    cwd: dirname(process.execPath),
    description: 'Noma (development build)',
    icon: iconIco,
    iconIndex: 0,
    appUserModelId: APP_USER_MODEL_ID,
    toastActivatorClsid: TOAST_ACTIVATOR_CLSID
  }
  try {
    if (!shortcutMatches(shortcut, wanted)) {
      shell.writeShortcutLink(shortcut, existsSync(shortcut) ? 'replace' : 'create', wanted)
    }
    // An earlier version kept a separate "Noma (dev)" shortcut with the same
    // app ID. Two shortcuts claiming one ID leave Windows to pick either, so
    // it goes.
    const old = join(programs, 'Noma (dev).lnk')
    if (existsSync(old)) unlinkSync(old)
  } catch (error) {
    console.warn('[app] could not write the dev Start Menu shortcut:', error)
  }
}

/** True when the shortcut already exists with exactly these details. */
function shortcutMatches(path: string, wanted: Electron.ShortcutDetails): boolean {
  if (!existsSync(path)) return false
  try {
    const current = shell.readShortcutLink(path)
    const same = (a: string | undefined, b: string | undefined): boolean =>
      (a ?? '').replace(/[{}]/g, '').toLowerCase() === (b ?? '').replace(/[{}]/g, '').toLowerCase()
    return (
      same(current.target, wanted.target) &&
      same(current.args, wanted.args) &&
      same(current.cwd, wanted.cwd) &&
      same(current.icon, wanted.icon) &&
      same(current.appUserModelId, wanted.appUserModelId) &&
      same(current.toastActivatorClsid, wanted.toastActivatorClsid)
    )
  } catch {
    return false
  }
}

/**
 * One Noma at a time (per profile: the lock is per userData folder, so the
 * test profile still runs beside the real one). A second copy would add a
 * second tray icon, a second set of input hooks and a second trackpad
 * listener pressing every control twice; launching Noma again brings
 * the running one forward instead.
 */
const isPrimaryInstance = app.requestSingleInstanceLock()
if (!isPrimaryInstance) app.quit()
else app.on('second-instance', () => showMainWindow())

app.whenReady().then(() => {
  if (!isPrimaryInstance) return
  registerAppIdentity()
  // In development the Dock shows Electron's icon; a packaged build uses the
  // bundle's own.
  if (isMac && is.dev) app.dock?.setIcon(iconMac)
  requestMacAccessibility()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  initWhatsNew()
  ipcMain.handle(IPC_CHANNELS.HOLO_OPEN_RECORDINGS, () => openRecordingsFolder())
  ipcMain.handle(IPC_CHANNELS.GLIDE_GET_STATE, () => glide.getState())
  ipcMain.handle(IPC_CHANNELS.MAC_EDGE_SWIPE_GET, () => getMacEdgeSwipe())
  ipcMain.handle(IPC_CHANNELS.MAC_EDGE_SWIPE_SET, (_event, enabled: boolean) => setMacEdgeSwipe(enabled === true))
  ipcMain.handle(IPC_CHANNELS.GLIDE_SET_ENABLED, (_event, enabled: boolean) => glide.setEnabled(enabled === true))
  ipcMain.handle(IPC_CHANNELS.GLIDE_SET_ZONE_COUNT, (_event, zoneCount: HoloTrackpadZoneCount) =>
    glide.setZoneCount(zoneCount === 2 ? 2 : 4)
  )
  ipcMain.handle(IPC_CHANNELS.HOLO_TOUCH_CHECK_START, () => glide.startTouchCheck())
  ipcMain.handle(IPC_CHANNELS.HOLO_TOUCH_CHECK_LAST, () => latestTouchCheckAt())
  ipcMain.handle(
    IPC_CHANNELS.HOLO_TOUCH_CHECK_STOP,
    (_event, phases: Array<{ kind: 'left' | 'right' | 'normal'; startAt: number; endAt: number }>) =>
      glide.stopTouchCheck(phases)
  )
  ipcMain.handle(IPC_CHANNELS.GET_DIAGNOSTICS_REPORT, () => buildDiagnosticsReport(glide.getState(), latestTouchCheckAt()))
  ipcMain.handle(IPC_CHANNELS.OPEN_ISSUE_PAGE, () => shell.openExternal(ISSUE_PAGE_URL))
  ipcMain.handle(IPC_CHANNELS.UPDATE_GET_STATUS, () => getUpdateStatus())
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, () => checkForUpdatesNow())
  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => installUpdateNow())
  ipcMain.handle(IPC_CHANNELS.UPDATE_OPEN_DOWNLOAD, () => openDownloadPage())
  ipcMain.handle(IPC_CHANNELS.WHATS_NEW_GET, () => getWhatsNew())
  ipcMain.handle(IPC_CHANNELS.WHATS_NEW_DISMISS, () => markWhatsNewSeen())
  onUpdateStatus((status) => {
    mainWindow?.webContents.send(IPC_CHANNELS.UPDATE_STATUS_CHANGED, status)
  })
  ipcMain.handle(IPC_CHANNELS.GET_ACTION_RUN_STATE, () => getActionRunState())
  ipcMain.handle(IPC_CHANNELS.CANCEL_RUNNING_ACTION, () => cancelRunningAction())
  onActionRunState((state) => {
    mainWindow?.webContents.send(IPC_CHANNELS.ACTION_RUN_STATE, state)
    updateTrayMenu()
  })

  // Noma Notice. Registered here rather than in registerIpcHandlers because,
  // like the two above, these belong to a window this file owns.
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_NOTICE_DISMISS,
    (_event, suggestionId: string, reason: 'timeout' | 'closed' | 'dismissed' | 'reviewed') => {
      workflowNotifier.dismiss(suggestionId, reason)
    }
  )
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_NOTICE_PENDING, () => getPendingWorkflowNotice())
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_NOTICE_SET_INTERACTIVE, (_event, interactive: boolean) => {
    setWorkflowNoticeInteractive(interactive)
  })
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_NOTICE_REVIEW, (_event, suggestionId: string) => {
    // Accepting ends in choosing which control slot the workflow lives on,
    // and a 400px card floating over someone's work is the wrong place to
    // ask that. This is the one interaction that deliberately brings the
    // main window forward; because the user asked for it.
    workflowNotifier.dismiss(suggestionId, 'reviewed')
    showMainWindow()
    mainWindow?.webContents.send(IPC_CHANNELS.OPEN_SUGGESTION_IN_APP, suggestionId)
  })
  ipcMain.handle(IPC_CHANNELS.SIMULATE_WORKFLOW_NOTICE, async () => {
    // Demo Mode: replay the real demo workflow through the real pipeline,
    // then put its real suggestion on screen: the threshold and cooldown
    // are the only things bypassed, so what appears is the production
    // surface with production data, not a mock.
    simulateDemoMultiStepWorkflow()
    await refreshSuggestions()
    markDemoSuggestions()
    // The most-repeated multi-application workflow, which after that replay
    // is the demo one; picked by the same "which workflow matters most"
    // rule the real policy uses, rather than by hardcoding the demo's id.
    const workflow = getPendingSuggestions()
      .filter((suggestion) => suggestion.chainApplicationNames)
      .sort((a, b) => (b.occurrenceCount ?? 0) - (a.occurrenceCount ?? 0) || b.confidence - a.confidence)[0]
    if (workflow) workflowNotifier.simulate(workflow, workflow.occurrenceCount ?? 0)
  })
  registerIpcHandlers(
    contextService,
    captureService,
    clickCaptureService,
    suggestionEngine,
    (applicationId) => {
      // A control was reassigned (e.g. accepting a suggestion, or
      // saving an edit in the Control Mapping Editor). If it belongs to
      // whichever application is currently focused, the onContextChanged
      // listener below (hardware controls + IPC push) fires the same way
      // it would for a normal app switch: the user doesn't have to
      // Alt-Tab away and back to see their own change.
      contextService.refreshIfCurrentApplication(applicationId)
    },
    () => osAdapter.getLastKnownWindowHandle(),
    refreshSuggestions,
    () => glide.setEnabled(false)
  )

  // Application context -> hardware simulator + capture service: whenever
  // the foreground application (and its resolved profile) changes,
  // reflect it on the virtual device exactly as a real STM32 device would
  // need to be told, and tag any subsequently-captured shortcuts with it.
  contextService.onContextChanged((context) => {
    void hardwareDevice.setControls(context.profile?.controls ?? [])
    void hardwareDevice.updateDisplay('status', context.application?.name ?? 'Idle')
    captureService.setCurrentApplicationId(context.application?.id ?? null)
    clickCaptureService.setCurrentApplicationId(context.application?.id ?? null)

    // Which app the user moved into is workflow metadata like any
    // other captured event. Flow needs it to recognize workflows that
    // span multiple applications (e.g. a screenshot tool -> an editor -> a
    // git client), not only the shortcuts pressed within one. Only
    // recorded on a genuine change (this listener also re-fires for a
    // same-app profile refresh and Demo Mode's hand-back-to-real-OS
    // resync; neither is a real switch) so one real switch is one row,
    // the same way a control activation is logged once per press. Still
    // exactly `{ applicationId, timestamp }`: see docs/privacy-and-legal.md.
    const newApplicationId = context.application?.id ?? null
    if (getWorkflowMonitoringEnabled() && newApplicationId !== lastRecordedApplicationId) {
      insertWorkflowEvent({ applicationId: newApplicationId, eventType: 'appSwitch', timestamp: Date.now() })
      void refreshSuggestions()
    }
    lastRecordedApplicationId = newApplicationId

    mainWindow?.webContents.send(IPC_CHANNELS.ACTIVE_CONTEXT_CHANGED, context)
  })
  contextService.start()

  hardwareDevice.onStatusChanged((status) => {
    mainWindow?.webContents.send(IPC_CHANNELS.HARDWARE_STATUS_CHANGED, status)
  })
  hardwareDevice.onLogEntry((entry) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DEVICE_LOG_ENTRY, entry)
  })
  hardwareDevice.onDeviceEvent((event) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DEVICE_EVENT, event)

    if (event.type === 'buttonPress') {
      // A control activation is workflow metadata like any other; log it
      // under the same enabled/disabled toggle as shortcut capture, tagged
      // with whichever application was active when it happened.
      if (getWorkflowMonitoringEnabled()) {
        insertWorkflowEvent({
          applicationId: contextService.getContext().application?.id ?? null,
          eventType: 'controlActivation',
          controlId: event.controlId,
          timestamp: Date.now()
        })
        void refreshSuggestions()
      }

      // This is the "not a pretty animation" step: actually run
      // whatever this control is configured to do, against whichever real
      // application was last focused (Flow's own window is excluded from
      // detection specifically so this handle always points at that real
      // target: see windowsAdapter.ts).
      const control = contextService
        .getContext()
        .profile?.controls.find((item) => item.id === event.controlId)
      if (control) {
        void executeControlActionExclusively(control.action, osAdapter.getLastKnownWindowHandle(), control.label).then(
          (result) => {
            if (!result.ok) notifyActionFailed(control.label, result.reason)
            logActionResult(control.label, control.action.type, result)
            mainWindow?.webContents.send(IPC_CHANNELS.ACTION_EXECUTED, {
              controlId: event.controlId,
              ok: result.ok,
              reason: result.reason
            })
            deviceTransportServer.notifyActionExecuted({
              controlId: event.controlId,
              ok: result.ok,
              reason: result.reason
            })

            // Flash the decorative keyboard layout's keys: the same
            // "digital twin reacts to real input" feedback a genuinely
            // captured shortcut gets, driven directly from the control's
            // own configured keys. This used to happen "for free" because
            // captureService's global hook picked up the control's own
            // synthetic keystroke and echoed it back as a captured combo
            // exactly the double-counting selfInjectedKeys.ts was written
            // to stop (see docs/architecture.md's "Real execution"
            // section), which correctly silenced that echo and, as a side
            // effect, silently took this cosmetic flash down with it. Only
            // fires on a real successful send (`result.ok`), matching what
            // the old accidental path actually did: a failed send never
            // reaches uIOhook.keyTap, so it never flashed either.
            if (result.ok && control.action.type === 'shortcut' && control.action.keys.length > 0) {
              mainWindow?.webContents.send(IPC_CHANNELS.WORKFLOW_COMBO_CAPTURED, control.action.keys)
            }
          }
        )
      }
    }
  })
  // The device no longer auto-connects here; it starts disconnected
  // ("no keyboard attached") and DeviceTransportServer connects/
  // disconnects it as the standalone Noma Virtual Device app actually
  // attaches/detaches, the same way a real USB keyboard would.
  void deviceTransportServer.start()

  // Workflow monitoring is off by default (see docs/privacy-and-legal.md).
  // Only re-engage the global hook here if the user previously opted in.
  if (getWorkflowMonitoringEnabled()) {
    captureService.start()
    if (getClickCaptureEnabled()) clickCaptureService.start()
  }

  createMainWindow()
  createTray()
  // Needs the main window: Glide reads the touchpad through its message loop.
  glide.resume()
  const captureFolder = process.env.NOMA_CAPTURE_NOTICE
  if (captureFolder && TEST_USER_DATA_DIR) {
    void captureNotice({
      folder: captureFolder,
      makeSuggestion: async () => {
        simulateDemoMultiStepWorkflow()
        await refreshSuggestions()
        return getPendingSuggestions()
          .filter((suggestion) => suggestion.chainApplicationNames)
          .sort((a, b) => (b.occurrenceCount ?? 0) - (a.occurrenceCount ?? 0) || b.confidence - a.confidence)[0]
      },
      show: (suggestion) => workflowNotifier.simulate(suggestion, suggestion.occurrenceCount ?? 0)
    })
  }
  const appCaptureFolder = process.env.NOMA_CAPTURE_APP
  if (appCaptureFolder && TEST_USER_DATA_DIR && mainWindow) {
    void captureApp({
      folder: appCaptureFolder,
      window: mainWindow,
      makeSuggestion: async () => {
        simulateDemoMultiStepWorkflow()
        await refreshSuggestions()
      }
    })
  }
  const smokeReport = process.env.NOMA_SMOKE_TEST
  if (smokeReport && TEST_USER_DATA_DIR && mainWindow) {
    runSmokeTest({
      reportPath: smokeReport,
      window: mainWindow,
      getContext: () => contextService.getContext(),
      enableGlide: () => glide.setEnabled(true)
    })
  }
  startAutoUpdates((version) => {
    readyUpdateVersion = version
    updateTrayMenu()
  })

  app.on('activate', function () {
    // Minimizing/closing now hides the window rather than destroying it
    // (see createMainWindow's `minimize`/`close` handlers), so on macOS a
    // dock click most often finds one already open, hidden; show it
    // instead of leaving `getAllWindows().length === 0` as the only check,
    // which would never fire again once the first window exists.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else showMainWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

// Quitting on macOS (Cmd+Q, the tray's Quit, an update) skips
// window-all-closed below, so Glide is also stopped here: a clean quit must
// clear Glide's crash-guard marker (see GlideController.resume).
app.on('will-quit', () => {
  glide.shutDown()
})

app.on('window-all-closed', () => {
  glide.shutDown()
  captureService.stop()
  clickCaptureService.stop()
  contextService.stop()
  deviceTransportServer.stop()
  osAdapter.dispose()
  if (!isMac) {
    app.quit()
  }
})
