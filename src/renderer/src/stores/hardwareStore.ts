import { create } from 'zustand'
import type { DeviceEvent, DeviceStatus } from '@shared/types'

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
  isLoading: boolean
  refresh: () => Promise<void>
  /** Subscribes to live hardware status + device events. Returns an unsubscribe function. */
  subscribe: () => () => void
  pressControl: (controlId: string) => Promise<void>
  addModule: (moduleType: string) => Promise<void>
  removeModule: (moduleId: string) => Promise<void>
}

export const useHardwareStore = create<HardwareStoreState>((set) => ({
  status: EMPTY_STATUS,
  lastEvent: null,
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
    return () => {
      unsubscribeStatus()
      unsubscribeEvent()
    }
  },
  pressControl: (controlId) => window.flow.pressControl(controlId),
  addModule: (moduleType) => window.flow.addModule(moduleType),
  removeModule: (moduleId) => window.flow.removeModule(moduleId)
}))
