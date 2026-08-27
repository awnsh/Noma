import { create } from 'zustand'

export type Page =
  | 'dashboard'
  | 'demo'
  | 'virtual-keyboard'
  | 'macros'
  | 'learning'
  | 'profiles'
  | 'developer'

interface UiStoreState {
  activePage: Page
  setActivePage: (page: Page) => void
}

export const useUiStore = create<UiStoreState>((set) => ({
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page })
}))
