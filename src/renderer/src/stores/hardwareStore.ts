import { create } from 'zustand'
import type { ActionExecutionEvent, DeviceEvent, DeviceStatus, ModuleFunctionConfig } from '@shared/types'

const EMPTY_STATUS: DeviceStatus = {
  connected: false,
  deviceType: 'virtual',
  protocolVersion: '0.0.0',
  controls: [],
  displays: {},
  modules: []
}

interface HardwareStoreState {
  status: DeviceStatus
  lastEvent: DeviceEvent | null
  /** The outcome of the most recent pressControl — whether it actually
   *  executed, and why not if it didn't. See docs/architecture.md. */
  lastExecution: ActionExecutionEvent | null
  isLoading: boolean
  refresh: () => Promise<void>
  /** Subscribes to live hardware status + device events. Returns an unsubscribe function. */
  subscribe: () => () => void
  pressControl: (controlId: string) => Promise<void>
  addModule: (moduleType: string) => Promise<void>
  removeModule: (moduleId: string) => Promise<void>
  configureModule: (moduleId: string, configuration: Record<string, ModuleFunctionConfig>) => Promise<void>
  simulateEncoderRotation: (moduleId: string, delta: number) => Promise<void>
}

export const useHardwareStore = create<HardwareStoreState>((set) => ({
  status: EMPTY_STATUS,
  lastEvent: null,
  lastExecution: null,
  isLoading: true,
  refresh: async () => {
    set({ isLoading: true })
    const status = await window.flow.getHardwareStatus()
    set({ status, isLoading: false })
  },
  subscribe: () => {
    const unsubscribeStatus = window.flow.onHardwareStatusChanged((status) => {
      set({ status, isLoading: false })
    })
    const unsubscribeEvent = window.flow.onDeviceEvent((event) => {
      set({ lastEvent: event })
    })
    const unsubscribeExecution = window.flow.onActionExecuted((event) => {
      set({ lastExecution: event })
    })
    return () => {
      unsubscribeStatus()
      unsubscribeEvent()
      unsubscribeExecution()
    }
  },
  pressControl: (controlId) => window.flow.pressControl(controlId),
  addModule: (moduleType) => window.flow.addModule(moduleType),
  removeModule: (moduleId) => window.flow.removeModule(moduleId),
  configureModule: async (moduleId, configuration) => {
    await window.flow.configureModule(moduleId, configuration)
  },
  simulateEncoderRotation: (moduleId, delta) => window.flow.simulateEncoderRotation(moduleId, delta)
}))
