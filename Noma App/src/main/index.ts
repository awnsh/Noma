import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC_CHANNELS } from '@shared/constants'
import { initDatabase } from './database/db'
import { registerIpcHandlers } from './ipc/handlers'
import { WindowsOSAdapter } from './os/windowsAdapter'
import { ApplicationContextService } from './applications/contextService'
import { getDefaultHardwareDevice } from './hardware/virtualDevice'
import { DeviceTransportServer } from './hardware/deviceTransportServer'
import { CaptureService } from './workflow/captureService'
import { ClickCaptureService } from './workflow/clickCaptureService'
import { UiaClickInspector } from './workflow/uiaInspector'
import { InputActivityService } from './holo/inputActivityService'
import { getLaptopInfo } from './holo/laptopInfo'
import { insertWorkflowEvent } from './database/repositories/workflowEventsRepository'
import { getClickCaptureEnabled, getWorkflowMonitoringEnabled } from './database/repositories/settingsRepository'
import { getSuggestionHistoryForKind, getPendingSuggestions } from './database/repositories/suggestionsRepository'
import { getApplicationById } from './database/repositories/applicationsRepository'
import { LocalRuleBasedProvider } from './ai/localProvider'
import { SuggestionEngine } from './ai/suggestionEngine'
import { executeControlAction } from './actions/actionExecutor'

let mainWindow: BrowserWindow | null = null
/** The last application a genuine appSwitch WorkflowEvent was recorded for
 *  (see contextService.onContextChanged below) — distinct from
 *  contextService's own `current`, which also updates for reasons that
 *  aren't a real switch (a control reassignment's same-app context
 *  refresh, Demo Mode handing control back to the real OS adapter). Lets
 *  that listener record one row per genuine switch, not one per emission. */
let lastRecordedApplicationId: string | null = null

/** Feeds Holo the timestamps (only) of real key/mouse activity so it can
 *  ignore the sound of typing and clicking. Engaged only while Holo asks. */
const inputActivityService = new InputActivityService((timestamp) => {
  mainWindow?.webContents.send(IPC_CHANNELS.HOLO_INPUT_ACTIVITY, timestamp)
})

const osAdapter = new WindowsOSAdapter()
const contextService = new ApplicationContextService(osAdapter)
const hardwareDevice = getDefaultHardwareDevice()
const deviceTransportServer = new DeviceTransportServer(hardwareDevice)
const aiProvider = new LocalRuleBasedProvider(
  getSuggestionHistoryForKind,
  (applicationId) => getApplicationById(applicationId)?.name ?? null
)
const suggestionEngine = new SuggestionEngine(aiProvider)

/** Re-runs pattern detection -> suggestion generation, then pushes the
 *  (possibly updated) pending list to the renderer. Called after every
 *  captured workflow event — see docs/architecture.md's learning loop. */
async function refreshSuggestions(): Promise<void> {
  await suggestionEngine.refresh()
  mainWindow?.webContents.send(IPC_CHANNELS.SUGGESTIONS_CHANGED, getPendingSuggestions())
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
  // keys of this real captured combo. Nothing new is exposed here — this
  // is exactly the already-sanitized combo insertWorkflowEvent just
  // persisted, not a raw keystroke.
  mainWindow?.webContents.send(IPC_CHANNELS.WORKFLOW_COMBO_CAPTURED, event.comboKeys)
})

/** Opt-in (settingsRepository's clickCaptureEnabled, off by default) and only
 *  ever engaged alongside workflow monitoring: records which on-screen
 *  control was clicked, sanitized to a label or a coarse window zone — see
 *  workflow/clickTarget.ts and docs/privacy-and-legal.md. */
const clickCaptureService = new ClickCaptureService((event) => {
  insertWorkflowEvent({
    applicationId: event.applicationId,
    eventType: 'click',
    clickTarget: event.clickTarget,
    timestamp: event.timestamp
  })
  void refreshSuggestions()
}, new UiaClickInspector())

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08080a',
    // Windows/Linux taskbar + window icon. macOS instead uses the app
    // bundle's icon (set at packaging time), which doesn't exist yet — see
    // "Prepare for STM32"/packaging notes; this only affects the
    // dev/unpackaged window on this machine.
    icon,
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

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.noma.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  ipcMain.handle(IPC_CHANNELS.GET_LAPTOP_INFO, () => getLaptopInfo())
  ipcMain.handle(IPC_CHANNELS.HOLO_SET_INPUT_GATE, (_event, enabled: boolean) => {
    if (enabled) inputActivityService.start()
    else inputActivityService.stop()
  })
  registerIpcHandlers(
    contextService,
    captureService,
    clickCaptureService,
    suggestionEngine,
    (applicationId) => {
      // A control was just reassigned (e.g. accepting a suggestion, or
      // saving an edit in the Control Mapping Editor). If it belongs to
      // whichever application is currently focused, the onContextChanged
      // listener below (hardware controls + IPC push) fires the same way
      // it would for a normal app switch — the user doesn't have to
      // Alt-Tab away and back to see their own change.
      contextService.refreshIfCurrentApplication(applicationId)
    },
    () => osAdapter.getLastKnownWindowHandle(),
    refreshSuggestions
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

    // Which app the user just moved into is workflow metadata like any
    // other captured event — Flow needs it to recognize workflows that
    // span multiple applications (e.g. a screenshot tool -> an editor -> a
    // git client), not only the shortcuts pressed within one. Only
    // recorded on a genuine change (this listener also re-fires for a
    // same-app profile refresh and Demo Mode's hand-back-to-real-OS
    // resync — neither is a real switch) so one real switch is one row,
    // the same way a control activation is logged once per press. Still
    // exactly `{ applicationId, timestamp }` — see docs/privacy-and-legal.md.
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
      // A control activation is workflow metadata like any other — log it
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

      // This is the "not just a pretty animation" step: actually run
      // whatever this control is configured to do, against whichever real
      // application was last focused (Flow's own window is excluded from
      // detection specifically so this handle always points at that real
      // target — see windowsAdapter.ts).
      const control = contextService
        .getContext()
        .profile?.controls.find((item) => item.id === event.controlId)
      if (control) {
        void executeControlAction(control.action, osAdapter.getLastKnownWindowHandle()).then(
          (result) => {
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

            // Flash the decorative keyboard layout's keys — the same
            // "digital twin reacts to real input" feedback a genuinely
            // captured shortcut gets, driven directly from the control's
            // own configured keys. This used to happen "for free" because
            // captureService's global hook picked up the control's own
            // synthetic keystroke and echoed it back as a captured combo —
            // exactly the double-counting selfInjectedKeys.ts was written
            // to stop (see docs/architecture.md's "Real execution"
            // section), which correctly silenced that echo and, as a side
            // effect, silently took this cosmetic flash down with it. Only
            // fires on a real successful send (`result.ok`), matching what
            // the old accidental path actually did — a failed send never
            // reaches uIOhook.keyTap, so it never flashed either.
            if (result.ok && control.action.type === 'shortcut' && control.action.keys.length > 0) {
              mainWindow?.webContents.send(IPC_CHANNELS.WORKFLOW_COMBO_CAPTURED, control.action.keys)
            }
          }
        )
      }
    }
  })
  // The device no longer auto-connects here — it starts disconnected
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  captureService.stop()
  clickCaptureService.stop()
  contextService.stop()
  deviceTransportServer.stop()
  osAdapter.dispose()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
