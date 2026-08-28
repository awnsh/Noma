import { create } from 'zustand'
import type { DeviceLogEntry, ExecutionStatus } from '@shared/types'

interface DeveloperStoreState {
  log: DeviceLogEntry[]
  executionStatus: ExecutionStatus | null
  isLoading: boolean
  lastPing: { ok: boolean; latencyMs: number } | null
  refresh: () => Promise<void>
  /** Subscribes to live device-log entries. Returns an unsubscribe function. */
  subscribe: () => () => void
  /** Developer Mode hardware bring-up tools — all real, all routed through
   *  VirtualHardwareDevice. See docs/architecture.md. */
  ping: () => Promise<void>
  reset: () => Promise<void>
  clearLog: () => Promise<void>
}

const MAX_DISPLAYED_ENTRIES = 100

export const useDeveloperStore = create<DeveloperStoreState>((set, get) => ({
  log: [],
  executionStatus: null,
  isLoading: true,
  lastPing: null,
  refresh: async () => {
    set({ isLoading: true })
    const [log, executionStatus] = await Promise.all([
      window.flow.getDeviceLog(),
      window.flow.getExecutionStatus()
    ])
    set({ log, executionStatus, isLoading: false })
  },
  subscribe: () => {
    return window.flow.onDeviceLogEntry((entry) => {
      set({ log: [...get().log.slice(-(MAX_DISPLAYED_ENTRIES - 1)), entry] })
    })
  },
  ping: async () => {
    const result = await window.flow.pingHardware()
    set({ lastPing: result })
  },
  reset: async () => {
    await window.flow.resetHardware()
  },
  clearLog: async () => {
    await window.flow.clearDeviceLog()
    set({ log: [] })
  }
}))
