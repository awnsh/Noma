import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  Application,
  ControlAction,
  FlowStatus,
  MacroStep,
  ModuleFunctionConfig,
  OnboardingState
} from '@shared/types'
import { getDatabase } from '../database/db'
import { getDefaultHardwareDevice } from '../hardware/virtualDevice'
import type { ApplicationContextService } from '../applications/contextService'
import type { CaptureService } from '../workflow/captureService'
import type { SuggestionEngine } from '../ai/suggestionEngine'
import {
  getWorkflowMonitoringEnabled,
  setWorkflowMonitoringEnabled
} from '../database/repositories/settingsRepository'
import {
  getDailyActivityCounts,
  getShortcutUsageStats,
  getWorkflowEventsSince
} from '../database/repositories/workflowEventsRepository'
import {
  getAllSuggestions,
  getPendingSuggestions,
  getSuggestionHistoryForKind,
  resolveSuggestion
} from '../database/repositories/suggestionsRepository'
import { getLearningStats } from '../ai/learningStats'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { getAllApplications } from '../database/repositories/applicationsRepository'
import {
  createMacro,
  deleteMacro,
  duplicateMacro,
  getAllMacros,
  updateMacro
} from '../database/repositories/macrosRepository'
import { getControlsReferencingMacro } from '../database/repositories/controlsRepository'
import { assignSuggestionToControl } from '../applications/suggestionResolution'
import { updateControl, resetControlToDefault } from '../applications/controlEditing'
import {
  createProfileForApplication,
  deleteApplicationProfile,
  listApplicationProfileSummaries,
  renameApplicationProfile
} from '../applications/profileCreation'
import { detectPatterns } from '../workflow/patternDetection'
import { startOfTodayMs } from '../workflow/timeWindows'
import {
  executeControlAction,
  executeMacroSteps,
  isKeystrokeExecutionEnabled
} from '../actions/actionExecutor'
import { DEMO_APPLICATIONS, resetDemoData, simulateDemoWorkflow } from '../demo/demoService'
import type { DemoApplicationId } from '../demo/demoService'
import { clearLearningData, deleteAllData } from '../privacy/dataManagement'
import { getOnboardingState, saveOnboardingState } from '../database/repositories/onboardingRepository'

export function registerIpcHandlers(
  contextService: ApplicationContextService,
  captureService: CaptureService,
  suggestionEngine: SuggestionEngine,
  /** Called with the affected application's id after a control is
   *  reassigned, so the caller can push a live update if it's the one
   *  currently focused. */
  onProfileUpdated: (applicationId: string) => void,
  /** The last known real (non-Flow) foreground window handle, for
   *  "Test" in the Control Mapping Editor — same targeting as a real
   *  press. */
  getTargetWindowHandle: () => number | null,
  /** Re-runs pattern detection -> suggestion generation and pushes the
   *  pending list to the renderer — the same function called after every
   *  real captured event (main/index.ts's `refreshSuggestions`), reused
   *  here so Demo Mode's simulated events flow through the identical
   *  pipeline. */
  triggerSuggestionRefresh: () => Promise<void>
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

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_CONTROL,
    (_event, applicationId: string, slot: number, label: string, action: ControlAction) => {
      const profile = updateControl(applicationId, slot, label, action)
      if (profile) onProfileUpdated(applicationId)
      return profile
    }
  )

  ipcMain.handle(IPC_CHANNELS.RESET_CONTROL_TO_DEFAULT, (_event, applicationId: string, slot: number) => {
    const profile = resetControlToDefault(applicationId, slot)
    if (profile) onProfileUpdated(applicationId)
    return profile
  })

  ipcMain.handle(IPC_CHANNELS.TEST_CONTROL_ACTION, async (_event, action: ControlAction) => {
    const result = await executeControlAction(action, getTargetWindowHandle())
    return { ok: result.ok, reason: result.reason }
  })

  ipcMain.handle(IPC_CHANNELS.GET_MACROS, () => getAllMacros())

  ipcMain.handle(IPC_CHANNELS.GET_ALL_APPLICATIONS, () => getAllApplications())

  ipcMain.handle(
    IPC_CHANNELS.CREATE_MACRO,
    (_event, name: string, actions: MacroStep[], applicationId?: string) =>
      createMacro({
        name,
        applicationId,
        trigger: 'manual',
        actions,
        delayMs: 0,
        enabled: true
      })
  )

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_MACRO,
    (_event, id: string, updates: { name?: string; actions?: MacroStep[]; enabled?: boolean }) =>
      updateMacro(id, updates)
  )

  ipcMain.handle(IPC_CHANNELS.DELETE_MACRO, (_event, id: string) => deleteMacro(id))

  ipcMain.handle(IPC_CHANNELS.DUPLICATE_MACRO, (_event, id: string) => duplicateMacro(id))

  ipcMain.handle(IPC_CHANNELS.GET_CONTROLS_REFERENCING_MACRO, (_event, macroId: string) =>
    getControlsReferencingMacro(macroId)
  )

  ipcMain.handle(IPC_CHANNELS.TEST_MACRO_STEPS, async (_event, actions: MacroStep[]) => {
    const result = await executeMacroSteps(actions, getTargetWindowHandle())
    return { ok: result.ok, reason: result.reason }
  })

  ipcMain.handle(IPC_CHANNELS.GET_ALL_SUGGESTIONS, () => getAllSuggestions())

  ipcMain.handle(IPC_CHANNELS.GET_LEARNING_STATS, () => getLearningStats(getSuggestionHistoryForKind))

  ipcMain.handle(IPC_CHANNELS.GET_SHORTCUT_USAGE_STATS, () => getShortcutUsageStats())

  ipcMain.handle(IPC_CHANNELS.GET_DAILY_ACTIVITY_COUNTS, (_event, days: number) =>
    getDailyActivityCounts(days)
  )

  ipcMain.handle(IPC_CHANNELS.LIST_APPLICATION_PROFILE_SUMMARIES, () =>
    listApplicationProfileSummaries()
  )

  ipcMain.handle(
    IPC_CHANNELS.CREATE_PROFILE_FOR_APPLICATION,
    (_event, application: Application, profileName: string) => {
      const profile = createProfileForApplication(application, profileName)
      if (profile) onProfileUpdated(application.id)
      return profile
    }
  )

  ipcMain.handle(IPC_CHANNELS.RENAME_APPLICATION_PROFILE, (_event, applicationId: string, name: string) => {
    const profile = renameApplicationProfile(applicationId, name)
    if (profile) onProfileUpdated(applicationId)
    return profile
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_APPLICATION_PROFILE, (_event, applicationId: string) => {
    const deleted = deleteApplicationProfile(applicationId)
    if (deleted) onProfileUpdated(applicationId)
    return deleted
  })

  ipcMain.handle(
    IPC_CHANNELS.DEMO_SET_APPLICATION,
    async (_event, applicationId: DemoApplicationId | null) => {
      await contextService.setDemoApplication(
        applicationId ? DEMO_APPLICATIONS[applicationId] : null
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.DEMO_SIMULATE_WORKFLOW, async () => {
    simulateDemoWorkflow()
    await triggerSuggestionRefresh()
  })

  ipcMain.handle(IPC_CHANNELS.DEMO_RESET, async () => {
    resetDemoData()
    // Refresh both demo profiles immediately in case one is currently the
    // overridden/focused application, and clear the (now-deleted) pending
    // suggestion list rather than leaving it stale until the next event.
    onProfileUpdated(DEMO_APPLICATIONS.code.id)
    onProfileUpdated(DEMO_APPLICATIONS.chrome.id)
    await triggerSuggestionRefresh()
  })

  ipcMain.handle(IPC_CHANNELS.CLEAR_LEARNING_DATA, async () => {
    clearLearningData()
    await triggerSuggestionRefresh()
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_ALL_DATA, async () => {
    // A factory reset invalidates the live capture hook's premise (its
    // "enabled" setting row no longer exists) — stop it explicitly rather
    // than leaving it running against a settings table that now says off.
    captureService.stop()
    deleteAllData()
    const currentApplicationId = contextService.getContext().application?.id
    if (currentApplicationId) contextService.refreshIfCurrentApplication(currentApplicationId)
    await triggerSuggestionRefresh()
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIGURE_MODULE,
    (_event, moduleId: string, configuration: Record<string, ModuleFunctionConfig>) =>
      getDefaultHardwareDevice().configureModule(moduleId, configuration)
  )

  ipcMain.handle(IPC_CHANNELS.PING_HARDWARE, () => getDefaultHardwareDevice().ping())

  ipcMain.handle(IPC_CHANNELS.RESET_HARDWARE, () => getDefaultHardwareDevice().reset())

  ipcMain.handle(
    IPC_CHANNELS.SIMULATE_ENCODER_ROTATION,
    (_event, moduleId: string, delta: number) => {
      getDefaultHardwareDevice().rotateEncoder(moduleId, delta)
    }
  )

  ipcMain.handle(IPC_CHANNELS.CLEAR_DEVICE_LOG, () => {
    getDefaultHardwareDevice().clearLog()
  })

  ipcMain.handle(IPC_CHANNELS.GET_ONBOARDING_STATE, () => getOnboardingState())

  ipcMain.handle(IPC_CHANNELS.SAVE_ONBOARDING_STATE, (_event, update: Partial<OnboardingState>) =>
    saveOnboardingState(update)
  )
}
