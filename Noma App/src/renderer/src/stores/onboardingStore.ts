import { create } from 'zustand'
import type { OnboardingState } from '@shared/types'

interface OnboardingStoreState {
  /** Null until load() resolves — App.tsx gates rendering on this so there
   *  is never a flash of the wrong screen (Dashboard vs. Onboarding). */
  state: OnboardingState | null
  isLoading: boolean
  load: () => Promise<void>
  save: (update: Partial<OnboardingState>) => Promise<void>
}

export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  state: null,
  isLoading: true,
  load: async () => {
    set({ isLoading: true })
    const state = await window.flow.getOnboardingState()
    set({ state, isLoading: false })
  },
  save: async (update) => {
    const state = await window.flow.saveOnboardingState(update)
    set({ state })
  }
}))
