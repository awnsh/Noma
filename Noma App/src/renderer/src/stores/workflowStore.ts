import { create } from 'zustand'
import type { DetectedPattern } from '@shared/types'

interface WorkflowStoreState {
  enabled: boolean
  clickCaptureEnabled: boolean
  patterns: DetectedPattern[]
  isLoading: boolean
  refresh: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
  setClickCaptureEnabled: (enabled: boolean) => Promise<void>
}

export const useWorkflowStore = create<WorkflowStoreState>((set) => ({
  enabled: false,
  clickCaptureEnabled: false,
  patterns: [],
  isLoading: true,
  refresh: async () => {
    set({ isLoading: true })
    const [enabled, clickCaptureEnabled, patterns] = await Promise.all([
      window.flow.getWorkflowMonitoringEnabled(),
      window.flow.getClickCaptureEnabled(),
      window.flow.getDetectedPatterns()
    ])
    set({ enabled, clickCaptureEnabled, patterns, isLoading: false })
  },
  setEnabled: async (enabled) => {
    const newState = await window.flow.setWorkflowMonitoringEnabled(enabled)
    set({ enabled: newState })
  },
  setClickCaptureEnabled: async (enabled) => {
    const newState = await window.flow.setClickCaptureEnabled(enabled)
    set({ clickCaptureEnabled: newState })
  }
}))
