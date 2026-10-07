import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  ActionExecutionEvent,
  Application,
  ApplicationContext,
  DeviceEvent,
  DeviceLogEntry,
  DeviceStatus,
  FlowApi,
  ActionRunState,
  GlideActivity,
  GlideState,
  MacroStep,
  ModuleFunctionConfig,
  Suggestion,
  UpdateStatus,
  WorkflowNotice
} from '@shared/types'

const flowApi: FlowApi = {
  getFlowStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_FLOW_STATUS),

  getActiveContext: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_CONTEXT),
  onActiveContextChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, context: ApplicationContext): void => callback(context)
    ipcRenderer.on(IPC_CHANNELS.ACTIVE_CONTEXT_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ACTIVE_CONTEXT_CHANGED, listener)
    }
  },

  getHardwareStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_HARDWARE_STATUS),
  onHardwareStatusChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, status: DeviceStatus): void => callback(status)
    ipcRenderer.on(IPC_CHANNELS.HARDWARE_STATUS_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HARDWARE_STATUS_CHANGED, listener)
    }
  },
  onDeviceEvent: (callback) => {
    const listener = (_event: IpcRendererEvent, deviceEvent: DeviceEvent): void => callback(deviceEvent)
    ipcRenderer.on(IPC_CHANNELS.DEVICE_EVENT, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.DEVICE_EVENT, listener)
    }
  },
  pressControl: (controlId) => ipcRenderer.invoke(IPC_CHANNELS.PRESS_CONTROL, controlId),
  onActionExecuted: (callback) => {
    const listener = (_event: IpcRendererEvent, executionEvent: ActionExecutionEvent): void =>
      callback(executionEvent)
    ipcRenderer.on(IPC_CHANNELS.ACTION_EXECUTED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ACTION_EXECUTED, listener)
    }
  },
  addModule: (moduleType) => ipcRenderer.invoke(IPC_CHANNELS.ADD_MODULE, moduleType),
  removeModule: (moduleId) => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_MODULE, moduleId),

  getClickCaptureEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CLICK_CAPTURE_ENABLED),
  setClickCaptureEnabled: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.SET_CLICK_CAPTURE_ENABLED, enabled),
  getWorkflowMonitoringEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKFLOW_MONITORING_ENABLED),
  setWorkflowMonitoringEnabled: (enabled) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_WORKFLOW_MONITORING_ENABLED, enabled),
  getDetectedPatterns: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DETECTED_PATTERNS),

  getSuggestions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SUGGESTIONS),
  resolveSuggestion: (id, status) => ipcRenderer.invoke(IPC_CHANNELS.RESOLVE_SUGGESTION, id, status),
  onSuggestionsChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, suggestions: Suggestion[]): void =>
      callback(suggestions)
    ipcRenderer.on(IPC_CHANNELS.SUGGESTIONS_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SUGGESTIONS_CHANGED, listener)
    }
  },

  getProfileForApplication: (applicationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILE_FOR_APPLICATION, applicationId),
  assignSuggestionToControl: (suggestionId, slot) =>
    ipcRenderer.invoke(IPC_CHANNELS.ASSIGN_SUGGESTION_TO_CONTROL, suggestionId, slot),

  getDeviceLog: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DEVICE_LOG),
  onDeviceLogEntry: (callback) => {
    const listener = (_event: IpcRendererEvent, entry: DeviceLogEntry): void => callback(entry)
    ipcRenderer.on(IPC_CHANNELS.DEVICE_LOG_ENTRY, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.DEVICE_LOG_ENTRY, listener)
    }
  },
  getExecutionStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_EXECUTION_STATUS),

  updateControl: (applicationId, slot, label, action) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONTROL, applicationId, slot, label, action),
  clearControl: (applicationId, slot) => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_CONTROL, applicationId, slot),
  testControlAction: (action) => ipcRenderer.invoke(IPC_CHANNELS.TEST_CONTROL_ACTION, action),
  getMacros: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MACROS),
  getAllApplications: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_APPLICATIONS),
  getApplicationIcon: (executablePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_APPLICATION_ICON, executablePath),

  createMacro: (name, actions, applicationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_MACRO, name, actions, applicationId),
  updateMacro: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_MACRO, id, updates),
  deleteMacro: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_MACRO, id),
  duplicateMacro: (id) => ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_MACRO, id),
  getControlsReferencingMacro: (macroId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CONTROLS_REFERENCING_MACRO, macroId),
  testMacroSteps: (actions: MacroStep[]) => ipcRenderer.invoke(IPC_CHANNELS.TEST_MACRO_STEPS, actions),

  getAllSuggestions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_SUGGESTIONS),
  getLearningStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_LEARNING_STATS),
  getShortcutUsageStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SHORTCUT_USAGE_STATS),
  getControlUsageStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONTROL_USAGE_STATS),
  getDailyActivityCounts: (days) => ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_ACTIVITY_COUNTS, days),

  listApplicationProfileSummaries: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LIST_APPLICATION_PROFILE_SUMMARIES),
  createProfileForApplication: (application: Application, profileName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROFILE_FOR_APPLICATION, application, profileName),
  renameApplicationProfile: (applicationId, name) =>
    ipcRenderer.invoke(IPC_CHANNELS.RENAME_APPLICATION_PROFILE, applicationId, name),
  deleteApplicationProfile: (applicationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_APPLICATION_PROFILE, applicationId),

  onWorkflowComboCaptured: (callback) => {
    const listener = (_event: IpcRendererEvent, comboKeys: string[]): void => callback(comboKeys)
    ipcRenderer.on(IPC_CHANNELS.WORKFLOW_COMBO_CAPTURED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WORKFLOW_COMBO_CAPTURED, listener)
    }
  },

  setDemoApplication: (applicationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_SET_APPLICATION, applicationId),
  simulateDemoWorkflow: () => ipcRenderer.invoke(IPC_CHANNELS.DEMO_SIMULATE_WORKFLOW),
  simulateDemoMultiStepWorkflow: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_SIMULATE_MULTI_STEP_WORKFLOW),
  resetDemoData: () => ipcRenderer.invoke(IPC_CHANNELS.DEMO_RESET),

  clearLearningData: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LEARNING_DATA),
  deleteAllData: () => ipcRenderer.invoke(IPC_CHANNELS.DELETE_ALL_DATA),

  configureModule: (moduleId: string, configuration: Record<string, ModuleFunctionConfig>) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIGURE_MODULE, moduleId, configuration),

  pingHardware: () => ipcRenderer.invoke(IPC_CHANNELS.PING_HARDWARE),
  resetHardware: () => ipcRenderer.invoke(IPC_CHANNELS.RESET_HARDWARE),
  simulateEncoderRotation: (moduleId: string, delta: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.SIMULATE_ENCODER_ROTATION, moduleId, delta),
  clearDeviceLog: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_DEVICE_LOG),

  getOnboardingState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ONBOARDING_STATE),
  saveOnboardingState: (update) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_ONBOARDING_STATE, update),

  openHoloRecordings: () => ipcRenderer.invoke(IPC_CHANNELS.HOLO_OPEN_RECORDINGS),
  startHoloTouchCheck: () => ipcRenderer.invoke(IPC_CHANNELS.HOLO_TOUCH_CHECK_START),
  getHoloTouchCheckLast: () => ipcRenderer.invoke(IPC_CHANNELS.HOLO_TOUCH_CHECK_LAST),
  stopHoloTouchCheck: (phases) => ipcRenderer.invoke(IPC_CHANNELS.HOLO_TOUCH_CHECK_STOP, phases),
  getGlideState: () => ipcRenderer.invoke(IPC_CHANNELS.GLIDE_GET_STATE),
  getMacEdgeSwipe: () => ipcRenderer.invoke(IPC_CHANNELS.MAC_EDGE_SWIPE_GET),
  setMacEdgeSwipe: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.MAC_EDGE_SWIPE_SET, enabled),
  setGlideEnabled: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.GLIDE_SET_ENABLED, enabled),
  setGlideZoneCount: (zoneCount) => ipcRenderer.invoke(IPC_CHANNELS.GLIDE_SET_ZONE_COUNT, zoneCount),
  onGlideState: (callback) => {
    const listener = (_event: IpcRendererEvent, value: GlideState): void => callback(value)
    ipcRenderer.on(IPC_CHANNELS.GLIDE_STATE_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.GLIDE_STATE_CHANGED, listener)
    }
  },
  onGlideActivity: (callback) => {
    const listener = (_event: IpcRendererEvent, value: GlideActivity): void => callback(value)
    ipcRenderer.on(IPC_CHANNELS.GLIDE_ACTIVITY, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.GLIDE_ACTIVITY, listener)
    }
  },

  getActionRunState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTION_RUN_STATE),
  onActionRunState: (callback) => {
    const listener = (_event: IpcRendererEvent, value: ActionRunState): void => callback(value)
    ipcRenderer.on(IPC_CHANNELS.ACTION_RUN_STATE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ACTION_RUN_STATE, listener)
    }
  },
  cancelRunningAction: () => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_RUNNING_ACTION),
  removeWorkflow: (macroId) => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_WORKFLOW, macroId),
  previewSuggestionAction: (suggestionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_SUGGESTION_ACTION, suggestionId),
  getDiagnosticsReport: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DIAGNOSTICS_REPORT),
  openIssuePage: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_ISSUE_PAGE),
  getUpdateStatus: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_STATUS),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),
  openUpdateDownload: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_OPEN_DOWNLOAD),
  getWhatsNew: () => ipcRenderer.invoke(IPC_CHANNELS.WHATS_NEW_GET),
  dismissWhatsNew: () => ipcRenderer.invoke(IPC_CHANNELS.WHATS_NEW_DISMISS),
  onUpdateStatus: (callback) => {
    const listener = (_event: IpcRendererEvent, value: UpdateStatus): void => callback(value)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_STATUS_CHANGED, listener)
    }
  },

  onWorkflowNoticeShown: (callback) => {
    const listener = (_event: IpcRendererEvent, notice: WorkflowNotice): void => callback(notice)
    ipcRenderer.on(IPC_CHANNELS.WORKFLOW_NOTICE_SHOWN, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WORKFLOW_NOTICE_SHOWN, listener)
    }
  },
  getPendingWorkflowNotice: () => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_NOTICE_PENDING),
  dismissWorkflowNotice: (suggestionId, reason) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_NOTICE_DISMISS, suggestionId, reason),
  setWorkflowNoticeInteractive: (interactive) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_NOTICE_SET_INTERACTIVE, interactive),
  reviewWorkflowNoticeInApp: (suggestionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_NOTICE_REVIEW, suggestionId),
  simulateWorkflowNotice: () => ipcRenderer.invoke(IPC_CHANNELS.SIMULATE_WORKFLOW_NOTICE),
  onOpenSuggestionInApp: (callback) => {
    const listener = (_event: IpcRendererEvent, suggestionId: string): void => callback(suggestionId)
    ipcRenderer.on(IPC_CHANNELS.OPEN_SUGGESTION_IN_APP, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.OPEN_SUGGESTION_IN_APP, listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('flow', flowApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error — fallback when context isolation is disabled
  window.flow = flowApi
}
