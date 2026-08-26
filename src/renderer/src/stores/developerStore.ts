import { create } from 'zustand'
import type { DeviceLogEntry, ExecutionStatus } from '@shared/types'

interface DeveloperStoreState {
  log: DeviceLogEntry[]
  executionStatus: ExecutionStatus | null
  isLoading: boolean
  refresh: () => Promise<void>
  /** Subscribes to live device-log entries. Returns an unsubscribe function. */
  subscribe: () => () => void
}

const MAX_DISPLAYED_ENTRIES = 100

export const useDeveloperStore = create<DeveloperStoreState>((set, get) => ({
  log: [],
  executionStatus: null,
  isLoading: true,
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
  }
}))
