import { create } from 'zustand'
import type { DetectedPattern } from '@shared/types'

interface WorkflowStoreState {
  enabled: boolean
  patterns: DetectedPattern[]
  isLoading: boolean
  refresh: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
}

export const useWorkflowStore = create<WorkflowStoreState>((set) => ({
  enabled: false,
  patterns: [],
  isLoading: true,
  refresh: async () => {
    set({ isLoading: true })
    const [enabled, patterns] = await Promise.all([
      window.flow.getWorkflowMonitoringEnabled(),
      window.flow.getDetectedPatterns()
    ])
    set({ enabled, patterns, isLoading: false })
  },
  setEnabled: async (enabled) => {
    const newState = await window.flow.setWorkflowMonitoringEnabled(enabled)
    set({ enabled: newState })
  }
}))
