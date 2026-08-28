import { create } from 'zustand'
import type { Suggestion, SuggestionStatus } from '@shared/types'

interface SuggestionsStoreState {
  suggestions: Suggestion[]
  isLoading: boolean
  refresh: () => Promise<void>
  /** Subscribes to live suggestion-list changes. Returns an unsubscribe function. */
  subscribe: () => () => void
  resolve: (id: string, status: Exclude<SuggestionStatus, 'pending'>) => Promise<void>
  /** Accepts a suggestion by assigning its action to the given control slot. Returns whether it succeeded. */
  assignToControl: (id: string, slot: number) => Promise<boolean>
}

export const useSuggestionsStore = create<SuggestionsStoreState>((set, get) => ({
  suggestions: [],
  isLoading: true,
  refresh: async () => {
    set({ isLoading: true })
    const suggestions = await window.flow.getSuggestions()
    set({ suggestions, isLoading: false })
  },
  subscribe: () => {
    return window.flow.onSuggestionsChanged((suggestions) => {
      set({ suggestions, isLoading: false })
    })
  },
  resolve: async (id, status) => {
    await window.flow.resolveSuggestion(id, status)
    // Optimistically drop it from the pending list locally — a resolved
    // suggestion is no longer pending, and the next SUGGESTIONS_CHANGED
    // push (if any) will reconcile fully.
    set({ suggestions: get().suggestions.filter((suggestion) => suggestion.id !== id) })
  },
  assignToControl: async (id, slot) => {
    const result = await window.flow.assignSuggestionToControl(id, slot)
    if (!result) return false
    set({ suggestions: get().suggestions.filter((suggestion) => suggestion.id !== id) })
    return true
  }
}))
