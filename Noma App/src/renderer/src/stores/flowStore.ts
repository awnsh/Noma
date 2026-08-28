import { create } from 'zustand'
import type { ApplicationContext, FlowStatus } from '@shared/types'

interface FlowStoreState {
  context: ApplicationContext
  flowStatus: FlowStatus
  isLoading: boolean
  refresh: () => Promise<void>
  /** Subscribes to live application-context changes. Returns an unsubscribe function. */
  subscribeToContext: () => () => void
}

export const useFlowStore = create<FlowStoreState>((set) => ({
  context: { application: null, profile: null },
  flowStatus: { actionsObservedToday: 0, patternsDetected: 0, suggestionsCount: 0 },
  isLoading: true,
  refresh: async () => {
    set({ isLoading: true })
    const [context, flowStatus] = await Promise.all([
      window.flow.getActiveContext(),
      window.flow.getFlowStatus()
    ])
    set({ context, flowStatus, isLoading: false })
  },
  subscribeToContext: () => {
    return window.flow.onActiveContextChanged((context) => {
      set({ context, isLoading: false })
    })
  }
}))
