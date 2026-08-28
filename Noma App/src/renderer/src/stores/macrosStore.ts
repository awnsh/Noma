import { create } from 'zustand'
import type { Macro } from '@shared/types'

interface MacrosStoreState {
  macros: Macro[]
  isLoading: boolean
  refresh: () => Promise<void>
}

/** Backs the Macro Studio's list — a thin cache over window.flow.getMacros
 *  so every save/delete/duplicate can refresh it in one place. */
export const useMacrosStore = create<MacrosStoreState>((set) => ({
  macros: [],
  isLoading: true,
  refresh: async () => {
    const macros = await window.flow.getMacros()
    set({ macros, isLoading: false })
  }
}))
