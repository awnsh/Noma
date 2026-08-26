import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { FlowStatus } from '@shared/types'
import { getDatabase } from '../database/db'
import { getDefaultHardwareDevice } from '../hardware/virtualDevice'
import type { ApplicationContextService } from '../applications/contextService'
import type { CaptureService } from '../workflow/captureService'
import type { SuggestionEngine } from '../ai/suggestionEngine'
import {
  getWorkflowMonitoringEnabled,
  setWorkflowMonitoringEnabled
} from '../database/repositories/settingsRepository'
import { getWorkflowEventsSince } from '../database/repositories/workflowEventsRepository'
import { getPendingSuggestions, resolveSuggestion } from '../database/repositories/suggestionsRepository'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { assignSuggestionToControl } from '../applications/suggestionResolution'
import { detectPatterns } from '../workflow/patternDetection'
import { startOfTodayMs } from '../workflow/timeWindows'
import { isKeystrokeExecutionEnabled } from '../actions/actionExecutor'

export function registerIpcHandlers(
  contextService: ApplicationContextService,
  captureService: CaptureService,
  suggestionEngine: SuggestionEngine,
  /** Called with the affected application's id after a control is
   *  reassigned, so the caller can push a live update if it's the one
   *  currently focused. */
  onProfileUpdated: (applicationId: string) => void
): void {
  ipcMain.handle(IPC_CHANNELS.GET_FLOW_STATUS, async (): Promise<FlowStatus> => {
    await suggestionEngine.refresh()

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

  ipcMain.handle(IPC_CHANNELS.GET_SUGGESTIONS, async () => {
    await suggestionEngine.refresh()
    return getPendingSuggestions()
  })

  ipcMain.handle(
    IPC_CHANNELS.RESOLVE_SUGGESTION,
    (_event, id: string, status: 'accepted' | 'rejected' | 'dismissed') =>
      resolveSuggestion(id, status)
  )

  ipcMain.handle(IPC_CHANNELS.GET_PROFILE_FOR_APPLICATION, (_event, applicationId: string) =>
    getProfileForApplicationId(applicationId)
  )

  ipcMain.handle(IPC_CHANNELS.ASSIGN_SUGGESTION_TO_CONTROL, (_event, suggestionId: string, slot: number) => {
    const result = assignSuggestionToControl(suggestionId, slot)
    if (result) {
      onProfileUpdated(result.profile.applicationId)
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.GET_DEVICE_LOG, () => getDefaultHardwareDevice().getLog())

  ipcMain.handle(IPC_CHANNELS.GET_EXECUTION_STATUS, () => ({
    keystrokeExecutionEnabled: isKeystrokeExecutionEnabled()
  }))
}
