import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  ActionExecutionEvent,
  ApplicationContext,
  DeviceEvent,
  DeviceStatus,
  FlowApi,
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
    ipcRenderer.invoke(IPC_CHANNELS.ASSIGN_SUGGESTION_TO_CONTROL, suggestionId, slot)
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
