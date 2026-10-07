import { create } from 'zustand'
import type { MacroDraft } from '../components/MacroEditor'

/**
 * Unsaved Macro Studio edits, per macro id (or 'new' for the new-macro
 * draft). They live in a store, not in the page, so switching between macros
 * or visiting another page and coming back never discards work. A draft is
 * removed when it matches what's saved again, or the macro is saved,
 * discarded or deleted.
 */
interface MacroDraftsState {
  drafts: Record<string, MacroDraft>
  setDraft: (key: string, draft: MacroDraft | null) => void
}

export const useMacroDraftsStore = create<MacroDraftsState>((set) => ({
  drafts: {},
  setDraft: (key, draft) =>
    set((state) => {
      if (!draft) {
        if (!(key in state.drafts)) return state
        const { [key]: _removed, ...rest } = state.drafts
        return { drafts: rest }
      }
      return { drafts: { ...state.drafts, [key]: draft } }
    })
}))
