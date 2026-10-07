import { create } from 'zustand'

// The primary surfaces plus the power-user/presentation pages, grouped in
// AppShell.tsx rather than deleted.
export type Page =
  | 'home'
  | 'workflows'
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

/** Pages for building and presenting Noma, not for using it: hidden unless
 *  developer tools are on (Settings). Demo Mode writes scripted data, and the
 *  Noma Device page needs the separate hardware simulator. */
export const DEVELOPER_PAGES: Page[] = ['virtual-keyboard', 'demo', 'developer']

const DEVELOPER_TOOLS_KEY = 'noma.developerTools'

function readDeveloperTools(): boolean {
  try {
    const stored = localStorage.getItem(DEVELOPER_TOOLS_KEY)
    if (stored !== null) return stored === '1'
  } catch {
    // Storage blocked: fall through to the default.
  }
  // On by default only when running from source.
  return import.meta.env.DEV
}

interface UiStoreState {
  activePage: Page
  developerTools: boolean
  /** Macro to select when Macro Studio next shows; consumed there. */
  pendingMacroId: string | null
  openMacro: (macroId: string) => void
  clearPendingMacro: () => void
  setActivePage: (page: Page) => void
  setDeveloperTools: (enabled: boolean) => void
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  activePage: 'home',
  developerTools: readDeveloperTools(),
  pendingMacroId: null,
  openMacro: (macroId) => set({ pendingMacroId: macroId, activePage: 'macros' }),
  clearPendingMacro: () => set({ pendingMacroId: null }),
  setActivePage: (page) => set({ activePage: page }),
  setDeveloperTools: (enabled) => {
    try {
      localStorage.setItem(DEVELOPER_TOOLS_KEY, enabled ? '1' : '0')
    } catch {
      // Storage blocked: the choice lasts until restart.
    }
    const leaving = !enabled && DEVELOPER_PAGES.includes(get().activePage)
    set({ developerTools: enabled, ...(leaving ? { activePage: 'settings' as Page } : {}) })
  }
}))
