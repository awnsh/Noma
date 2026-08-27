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
  MacroStep,
  Suggestion
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
  resetControlToDefault: (applicationId, slot) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_CONTROL_TO_DEFAULT, applicationId, slot),
  testControlAction: (action) => ipcRenderer.invoke(IPC_CHANNELS.TEST_CONTROL_ACTION, action),
  getMacros: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MACROS),
  getAllApplications: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_APPLICATIONS),

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
  resetDemoData: () => ipcRenderer.invoke(IPC_CHANNELS.DEMO_RESET)
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
