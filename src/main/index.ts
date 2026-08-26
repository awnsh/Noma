import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@shared/constants'
import { initDatabase } from './database/db'
import { registerIpcHandlers } from './ipc/handlers'
import { WindowsOSAdapter } from './os/windowsAdapter'
import { ApplicationContextService } from './applications/contextService'
import { getDefaultHardwareDevice } from './hardware/virtualDevice'
import { CaptureService } from './workflow/captureService'
import { insertWorkflowEvent } from './database/repositories/workflowEventsRepository'
import { getWorkflowMonitoringEnabled } from './database/repositories/settingsRepository'
import { getConfidenceBiasForKind, getPendingSuggestions } from './database/repositories/suggestionsRepository'
import { LocalRuleBasedProvider } from './ai/localProvider'
import { SuggestionEngine } from './ai/suggestionEngine'

let mainWindow: BrowserWindow | null = null

const osAdapter = new WindowsOSAdapter()
const contextService = new ApplicationContextService(osAdapter)
const hardwareDevice = getDefaultHardwareDevice()
const aiProvider = new LocalRuleBasedProvider(getConfidenceBiasForKind)
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
})

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08080a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Explicit, not relied-on-as-default: no Node access in the
      // renderer, isolated from the preload's JS context, and Chromium's
      // OS-level sandbox enabled. See docs/security-review.md.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
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
  electronApp.setAppUserModelId('com.flow.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  registerIpcHandlers(contextService, captureService, suggestionEngine, (applicationId) => {
    // A control was just reassigned (e.g. accepting a suggestion). If it
    // belongs to whichever application is currently focused, the
    // onContextChanged listener below (hardware controls + IPC push)
    // fires the same way it would for a normal app switch — the user
    // doesn't have to Alt-Tab away and back to see their own change.
    contextService.refreshIfCurrentApplication(applicationId)
  })

  // Application context -> hardware simulator + capture service: whenever
  // the foreground application (and its resolved profile) changes,
  // reflect it on the virtual device exactly as a real STM32 device would
  // need to be told, and tag any subsequently-captured shortcuts with it.
  contextService.onContextChanged((context) => {
    void hardwareDevice.setControls(context.profile?.controls ?? [])
    void hardwareDevice.updateDisplay('status', context.application?.name ?? 'Idle')
    captureService.setCurrentApplicationId(context.application?.id ?? null)
    mainWindow?.webContents.send(IPC_CHANNELS.ACTIVE_CONTEXT_CHANGED, context)
  })
  contextService.start()

  hardwareDevice.onStatusChanged((status) => {
    mainWindow?.webContents.send(IPC_CHANNELS.HARDWARE_STATUS_CHANGED, status)
  })
  hardwareDevice.onDeviceEvent((event) => {
    mainWindow?.webContents.send(IPC_CHANNELS.DEVICE_EVENT, event)

    // A control activation is workflow metadata like any other — log it
    // under the same enabled/disabled toggle as shortcut capture, tagged
    // with whichever application was active when it happened.
    if (event.type === 'buttonPress' && getWorkflowMonitoringEnabled()) {
      insertWorkflowEvent({
        applicationId: contextService.getContext().application?.id ?? null,
        eventType: 'controlActivation',
        controlId: event.controlId,
        timestamp: Date.now()
      })
      void refreshSuggestions()
    }
  })
  void hardwareDevice.connect()

  // Workflow monitoring is off by default (see docs/privacy-and-legal.md).
  // Only re-engage the global hook here if the user previously opted in.
  if (getWorkflowMonitoringEnabled()) {
    captureService.start()
  }

  createMainWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  captureService.stop()
  contextService.stop()
  osAdapter.dispose()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
