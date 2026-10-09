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
import type { ClickCaptureService } from '../workflow/clickCaptureService'
import type { SuggestionEngine } from '../ai/suggestionEngine'
import {
  getClickCaptureEnabled,
  getWorkflowMonitoringEnabled,
  setClickCaptureEnabled,
  setWorkflowMonitoringEnabled
} from '../database/repositories/settingsRepository'
import { removeLearnedWorkflow } from '../applications/workflowRemoval'
import { previewSuggestion } from '../applications/workflowPreview'
import {
  getControlUsageStats,
  getDailyActivityCounts,
  getShortcutUsageStats,
  getWorkflowEventsSince
} from '../database/repositories/workflowEventsRepository'
import {
  getAllSuggestions,
  getPendingSuggestions,
  getSuggestionById,
  getSuggestionHistoryForKind,
  resolveSuggestion
} from '../database/repositories/suggestionsRepository'
import { getLearningStats } from '../ai/learningStats'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { getAllApplications } from '../database/repositories/applicationsRepository'
import { getApplicationIcon } from '../applications/iconService'
import {
  createMacro,
  deleteMacro,
  duplicateMacro,
  getAllMacros,
  updateMacro
} from '../database/repositories/macrosRepository'
import { getControlsReferencingMacro } from '../database/repositories/controlsRepository'
import { assignSuggestionToControl } from '../applications/suggestionResolution'
import { updateControl, clearControl } from '../applications/controlEditing'
import {
  createProfileForApplication,
  deleteApplicationProfile,
  listApplicationProfileSummaries,
  renameApplicationProfile
} from '../applications/profileCreation'
import { detectPatterns } from '../workflow/patternDetection'
import { startOfTodayMs } from '../workflow/timeWindows'
import {
  executeControlActionExclusively,
  executeMacroSteps,
  isKeystrokeExecutionEnabled,
  runActionExclusively
} from '../actions/actionExecutor'
import {
  DEMO_APPLICATIONS,
  markDemoSuggestions,
  resetDemoData,
  simulateDemoMultiStepWorkflow,
  simulateDemoWorkflow
} from '../demo/demoService'
import type { DemoApplicationId } from '../demo/demoService'
import { clearLearningData, deleteAllData } from '../privacy/dataManagement'
import { getOnboardingState, saveOnboardingState } from '../database/repositories/onboardingRepository'
import {
  isValidActivityDays,
  isValidApplication,
  isValidControlAction,
  isValidControlLabel,
  isValidEncoderDelta,
  isValidId,
  isValidMacroSteps,
  isValidModuleConfiguration,
  isValidOnboardingUpdate,
  isValidSlot,
  isValidSuggestionResolution,
  normalizeMacroName,
  normalizeProfileName,
  parseMacroUpdate
} from './validation'

/** The Test buttons' answer to a payload that failed validation: the same
 *  {ok, reason} shape as a refused run, so the editor shows it inline. */
const INVALID_ACTION_RESULT = { ok: false, reason: 'Refused: this action is malformed and was not run' }

export function registerIpcHandlers(
  contextService: ApplicationContextService,
  captureService: CaptureService,
  clickCaptureService: ClickCaptureService,
  suggestionEngine: SuggestionEngine,
  /** Called with the affected application's id after a control is
   *  reassigned, so the caller can push a live update if it's the one
   *  currently focused. */
  onProfileUpdated: (applicationId: string) => void,
  /** The last known real (non-Flow) foreground window handle, for
   *  "Test" in the Control Mapping Editor; same targeting as a real
   *  press. */
  getTargetWindowHandle: () => number | null,
  /** Re-runs pattern detection -> suggestion generation and pushes the
   *  pending list to the renderer: the same function called after every
   *  real captured event (main/index.ts's `refreshSuggestions`), reused
   *  here so Demo Mode's simulated events flow through the identical
   *  pipeline. */
  triggerSuggestionRefresh: () => Promise<void>,
  /** After a factory reset: anything else main runs from a now-deleted
   *  setting (Glide) is stopped too. */
  afterDeleteAllData: () => void = () => {}
): void {
  // Every argument below arrives from the renderer as an untyped structured
  // clone; the annotations are what the renderer *should* send, not a
  // guarantee. Each handler checks its arguments with validation.ts first
  // and, on a malformed payload, returns its own normal "nothing happened"
  // value (null/false/[]/{ok:false}) instead of storing or running it.
  // Never throws: a rejected invoke() is an unhandled error in the renderer.
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
    if (!isValidId(controlId)) return
    getDefaultHardwareDevice().pressControl(controlId)
  })

  ipcMain.handle(IPC_CHANNELS.ADD_MODULE, (_event, moduleType: string) => {
    if (!isValidId(moduleType)) return
    getDefaultHardwareDevice().addModuleByType(moduleType)
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_MODULE, (_event, moduleId: string) => {
    if (!isValidId(moduleId)) return
    getDefaultHardwareDevice().removeModule(moduleId)
  })

  ipcMain.handle(IPC_CHANNELS.GET_WORKFLOW_MONITORING_ENABLED, () => getWorkflowMonitoringEnabled())

  ipcMain.handle(IPC_CHANNELS.SET_WORKFLOW_MONITORING_ENABLED, (_event, enabled: boolean) => {
    // Not a boolean: change nothing and report the current state.
    if (typeof enabled !== 'boolean') return getWorkflowMonitoringEnabled()
    setWorkflowMonitoringEnabled(enabled)
    if (enabled) {
      captureService.start()
      if (getClickCaptureEnabled()) clickCaptureService.start()
    } else {
      captureService.stop()
      clickCaptureService.stop()
    }
    return getWorkflowMonitoringEnabled()
  })

  ipcMain.handle(IPC_CHANNELS.GET_CLICK_CAPTURE_ENABLED, () => getClickCaptureEnabled())

  ipcMain.handle(IPC_CHANNELS.SET_CLICK_CAPTURE_ENABLED, (_event, enabled: boolean) => {
    if (typeof enabled !== 'boolean') return getClickCaptureEnabled()
    setClickCaptureEnabled(enabled)
    // Click capture only ever runs while workflow monitoring is also on.
    if (enabled && getWorkflowMonitoringEnabled()) clickCaptureService.start()
    else clickCaptureService.stop()
    return getClickCaptureEnabled()
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
      isValidId(id) && isValidSuggestionResolution(status) ? resolveSuggestion(id, status) : null
  )

  ipcMain.handle(IPC_CHANNELS.GET_PROFILE_FOR_APPLICATION, (_event, applicationId: string) =>
    isValidId(applicationId) ? getProfileForApplicationId(applicationId) : null
  )

  ipcMain.handle(IPC_CHANNELS.ASSIGN_SUGGESTION_TO_CONTROL, (_event, suggestionId: string, slot: number) => {
    if (!isValidId(suggestionId) || !isValidSlot(slot)) return null
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
      if (
        !isValidId(applicationId) ||
        !isValidSlot(slot) ||
        !isValidControlLabel(label) ||
        !isValidControlAction(action)
      ) {
        return null
      }
      const profile = updateControl(applicationId, slot, label, action)
      if (profile) onProfileUpdated(applicationId)
      return profile
    }
  )

  ipcMain.handle(IPC_CHANNELS.CLEAR_CONTROL, (_event, applicationId: string, slot: number) => {
    if (!isValidId(applicationId) || !isValidSlot(slot)) return null
    const profile = clearControl(applicationId, slot)
    if (profile) onProfileUpdated(applicationId)
    return profile
  })

  ipcMain.handle(IPC_CHANNELS.TEST_CONTROL_ACTION, async (_event, action: ControlAction) => {
    if (!isValidControlAction(action)) return INVALID_ACTION_RESULT
    const result = await executeControlActionExclusively(action, getTargetWindowHandle(), 'Test')
    return { ok: result.ok, reason: result.reason }
  })

  ipcMain.handle(IPC_CHANNELS.GET_MACROS, () => getAllMacros())

  ipcMain.handle(IPC_CHANNELS.GET_ALL_APPLICATIONS, () => getAllApplications())

  ipcMain.handle(IPC_CHANNELS.GET_APPLICATION_ICON, (_event, executablePath: string) =>
    typeof executablePath === 'string' ? getApplicationIcon(executablePath) : null
  )

  ipcMain.handle(
    IPC_CHANNELS.CREATE_MACRO,
    (_event, name: string, actions: MacroStep[], applicationId?: string) => {
      const macroName = normalizeMacroName(name)
      if (macroName === null || !isValidMacroSteps(actions)) return null
      if (applicationId !== undefined && !isValidId(applicationId)) return null
      return createMacro({
        name: macroName,
        applicationId,
        trigger: 'manual',
        actions,
        delayMs: 0,
        enabled: true
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_MACRO,
    (_event, id: string, updates: { name?: string; actions?: MacroStep[]; enabled?: boolean }) => {
      // parseMacroUpdate rebuilds the update from known fields only, so a
      // stray key (e.g. `applicationId`, which updateMacro would also
      // accept) can't ride along from the renderer.
      const parsed = parseMacroUpdate(updates)
      if (!isValidId(id) || parsed === null) return null
      return updateMacro(id, parsed)
    }
  )

  ipcMain.handle(IPC_CHANNELS.DELETE_MACRO, (_event, id: string) => (isValidId(id) ? deleteMacro(id) : false))

  ipcMain.handle(IPC_CHANNELS.DUPLICATE_MACRO, (_event, id: string) => (isValidId(id) ? duplicateMacro(id) : null))

  ipcMain.handle(IPC_CHANNELS.GET_CONTROLS_REFERENCING_MACRO, (_event, macroId: string) =>
    isValidId(macroId) ? getControlsReferencingMacro(macroId) : []
  )

  ipcMain.handle(IPC_CHANNELS.TEST_MACRO_STEPS, async (_event, actions: MacroStep[]) => {
    if (!isValidMacroSteps(actions)) return INVALID_ACTION_RESULT
    const result = await runActionExclusively(() => executeMacroSteps(actions, getTargetWindowHandle()), 'Test')
    return { ok: result.ok, reason: result.reason }
  })

  ipcMain.handle(IPC_CHANNELS.GET_ALL_SUGGESTIONS, () => getAllSuggestions())

  ipcMain.handle(IPC_CHANNELS.GET_LEARNING_STATS, () => getLearningStats(getSuggestionHistoryForKind))

  ipcMain.handle(IPC_CHANNELS.GET_SHORTCUT_USAGE_STATS, () => getShortcutUsageStats())

  ipcMain.handle(IPC_CHANNELS.GET_CONTROL_USAGE_STATS, () => getControlUsageStats())

  ipcMain.handle(IPC_CHANNELS.GET_DAILY_ACTIVITY_COUNTS, (_event, days: number) =>
    isValidActivityDays(days) ? getDailyActivityCounts(days) : []
  )

  ipcMain.handle(IPC_CHANNELS.LIST_APPLICATION_PROFILE_SUMMARIES, () =>
    listApplicationProfileSummaries()
  )

  ipcMain.handle(
    IPC_CHANNELS.CREATE_PROFILE_FOR_APPLICATION,
    (_event, application: Application, profileName: string) => {
      // The name is trimmed/capped again inside createProfileForApplication
      // (its other callers aren't IPC); checked here too so a bad name
      // doesn't get as far as upserting the application row.
      if (!isValidApplication(application) || normalizeProfileName(profileName) === null) return null
      const profile = createProfileForApplication(application, profileName)
      if (profile) onProfileUpdated(application.id)
      return profile
    }
  )

  ipcMain.handle(IPC_CHANNELS.RENAME_APPLICATION_PROFILE, (_event, applicationId: string, name: string) => {
    if (!isValidId(applicationId)) return null
    const profile = renameApplicationProfile(applicationId, name)
    if (profile) onProfileUpdated(applicationId)
    return profile
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_APPLICATION_PROFILE, (_event, applicationId: string) => {
    if (!isValidId(applicationId)) return false
    const deleted = deleteApplicationProfile(applicationId)
    if (deleted) onProfileUpdated(applicationId)
    return deleted
  })

  ipcMain.handle(
    IPC_CHANNELS.DEMO_SET_APPLICATION,
    async (_event, applicationId: DemoApplicationId | null) => {
      if (applicationId !== null && !Object.hasOwn(DEMO_APPLICATIONS, applicationId)) return
      await contextService.setDemoApplication(
        applicationId ? DEMO_APPLICATIONS[applicationId] : null
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.DEMO_SIMULATE_WORKFLOW, async () => {
    simulateDemoWorkflow()
    await triggerSuggestionRefresh()
    markDemoSuggestions()
    await triggerSuggestionRefresh()
  })

  ipcMain.handle(IPC_CHANNELS.DEMO_SIMULATE_MULTI_STEP_WORKFLOW, async () => {
    simulateDemoMultiStepWorkflow()
    await triggerSuggestionRefresh()
    markDemoSuggestions()
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
    // "enabled" setting row no longer exists); stop it explicitly rather
    // than leaving it running against a settings table that now says off.
    captureService.stop()
    clickCaptureService.stop()
    deleteAllData()
    afterDeleteAllData()
    const currentApplicationId = contextService.getContext().application?.id
    if (currentApplicationId) contextService.refreshIfCurrentApplication(currentApplicationId)
    await triggerSuggestionRefresh()
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIGURE_MODULE,
    (_event, moduleId: string, configuration: Record<string, ModuleFunctionConfig>) =>
      isValidId(moduleId) && isValidModuleConfiguration(configuration)
        ? getDefaultHardwareDevice().configureModule(moduleId, configuration)
        : null
  )

  ipcMain.handle(IPC_CHANNELS.PING_HARDWARE, () => getDefaultHardwareDevice().ping())

  ipcMain.handle(IPC_CHANNELS.RESET_HARDWARE, () => getDefaultHardwareDevice().reset())

  ipcMain.handle(
    IPC_CHANNELS.SIMULATE_ENCODER_ROTATION,
    (_event, moduleId: string, delta: number) => {
      if (!isValidId(moduleId) || !isValidEncoderDelta(delta)) return
      getDefaultHardwareDevice().rotateEncoder(moduleId, delta)
    }
  )

  ipcMain.handle(IPC_CHANNELS.CLEAR_DEVICE_LOG, () => {
    getDefaultHardwareDevice().clearLog()
  })

  ipcMain.handle(IPC_CHANNELS.GET_ONBOARDING_STATE, () => getOnboardingState())

  ipcMain.handle(IPC_CHANNELS.SAVE_ONBOARDING_STATE, (_event, update: Partial<OnboardingState>) =>
    isValidOnboardingUpdate(update) ? saveOnboardingState(update) : getOnboardingState()
  )

  ipcMain.handle(IPC_CHANNELS.REMOVE_WORKFLOW, (_event, macroId: string) => {
    if (!isValidId(macroId)) return false
    const result = removeLearnedWorkflow(macroId)
    if (!result) return false
    for (const applicationId of result.applicationIds) onProfileUpdated(applicationId)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.PREVIEW_SUGGESTION_ACTION, (_event, suggestionId: string) => {
    if (!isValidId(suggestionId)) return null
    const suggestion = getSuggestionById(suggestionId)
    return suggestion ? previewSuggestion(suggestion) : null
  })
}
