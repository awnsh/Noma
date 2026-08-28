import { create } from 'zustand'

type LastAction = 'clearedLearningData' | 'deletedAllData' | null

interface PrivacyStoreState {
  isBusy: boolean
  lastAction: LastAction
  clearLearningData: () => Promise<void>
  deleteAllData: () => Promise<void>
  dismiss: () => void
}

/**
 * Backs the Settings page's data-management actions (this phase's section
 * 13, docs/privacy-and-legal.md). Deliberately its own store, not folded
 * into workflowStore — clearing/deleting data is a one-shot action with a
 * transient confirmation message, not ongoing state to subscribe to.
 */
export const usePrivacyStore = create<PrivacyStoreState>((set) => ({
  isBusy: false,
  lastAction: null,
  clearLearningData: async () => {
    set({ isBusy: true })
    await window.flow.clearLearningData()
    set({ isBusy: false, lastAction: 'clearedLearningData' })
  },
  deleteAllData: async () => {
    set({ isBusy: true })
    await window.flow.deleteAllData()
    set({ isBusy: false, lastAction: 'deletedAllData' })
  },
  dismiss: () => set({ lastAction: null })
}))
