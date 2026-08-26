import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { FlowStatus } from '@shared/types'
import { getDatabase } from '../database/db'
import { getDefaultHardwareDevice } from '../hardware/virtualDevice'
import type { ApplicationContextService } from '../applications/contextService'
import type { CaptureService } from '../workflow/captureService'
import {
  getWorkflowMonitoringEnabled,
  setWorkflowMonitoringEnabled
} from '../database/repositories/settingsRepository'
import { getWorkflowEventsSince } from '../database/repositories/workflowEventsRepository'
import { detectPatterns } from '../workflow/patternDetection'

function startOfTodayMs(): number {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  return todayStart.getTime()
}

export function registerIpcHandlers(
  contextService: ApplicationContextService,
  captureService: CaptureService
): void {
  ipcMain.handle(IPC_CHANNELS.GET_FLOW_STATUS, (): FlowStatus => {
    const db = getDatabase()
    const todayStartMs = startOfTodayMs()

    const actionsObservedToday = db
      .prepare('SELECT COUNT(*) as count FROM workflow_events WHERE timestamp >= ?')
      .get(todayStartMs) as { count: number }

    const suggestionsCount = db
      .prepare("SELECT COUNT(*) as count FROM suggestions WHERE status = 'pending'")
      .get() as { count: number }

    const patternsDetected = detectPatterns(getWorkflowEventsSince(todayStartMs)).length

    return {
      actionsObservedToday: actionsObservedToday.count,
      patternsDetected,
      suggestionsCount: suggestionsCount.count
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_CONTEXT, () => contextService.getContext())

  ipcMain.handle(IPC_CHANNELS.GET_HARDWARE_STATUS, () => getDefaultHardwareDevice().getStatus())

  ipcMain.handle(IPC_CHANNELS.PRESS_CONTROL, (_event, controlId: string) => {
    getDefaultHardwareDevice().pressControl(controlId)
  })

  ipcMain.handle(IPC_CHANNELS.ADD_MODULE, (_event, moduleType: string) => {
    getDefaultHardwareDevice().addModuleByType(moduleType)
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_MODULE, (_event, moduleId: string) => {
    getDefaultHardwareDevice().removeModule(moduleId)
  })

  ipcMain.handle(IPC_CHANNELS.GET_WORKFLOW_MONITORING_ENABLED, () => getWorkflowMonitoringEnabled())

  ipcMain.handle(IPC_CHANNELS.SET_WORKFLOW_MONITORING_ENABLED, (_event, enabled: boolean) => {
    setWorkflowMonitoringEnabled(enabled)
    if (enabled) {
      captureService.start()
    } else {
      captureService.stop()
    }
    return getWorkflowMonitoringEnabled()
  })

  ipcMain.handle(IPC_CHANNELS.GET_DETECTED_PATTERNS, () =>
    detectPatterns(getWorkflowEventsSince(startOfTodayMs()))
  )
}
