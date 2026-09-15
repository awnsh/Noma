import { create } from 'zustand'

// The 5 primary surfaces (product brief's information architecture) plus
// the existing power-user/presentation pages, demoted to a secondary nav
// group in AppShell.tsx rather than deleted — see that file's doc comment.
export type Page =
  | 'home'
  | 'controls'
  | 'learning'
  | 'activity'
  | 'settings'
  | 'virtual-keyboard'
  | 'holo'
  | 'macros'
  | 'profiles'
  | 'usage-stats'
  | 'demo'
  | 'developer'

interface UiStoreState {
  activePage: Page
  setActivePage: (page: Page) => void
}

export const useUiStore = create<UiStoreState>((set) => ({
  activePage: 'home',
  setActivePage: (page) => set({ activePage: page })
}))
