import { create } from 'zustand'
import type { RejectionReason, Suggestion, SuggestionStatus } from '@shared/types'

interface SuggestionsStoreState {
  /** Pending suggestions, plus any just saved and not yet dismissed (so the
   *  card can confirm what was saved instead of vanishing). */
  suggestions: Suggestion[]
  isLoading: boolean
  /** Bumped whenever saved workflows change (one was saved or removed), so
   *  lists of saved workflows reload. */
  workflowsVersion: number
  refresh: () => Promise<void>
  /** Subscribes to live suggestion-list changes. Returns an unsubscribe function. */
  subscribe: () => () => void
  resolve: (id: string, status: Exclude<SuggestionStatus, 'pending'>, reason?: RejectionReason) => Promise<void>
  /** Accepts a suggestion by assigning its action to the given control slot. Returns whether it succeeded. */
  assignToControl: (id: string, slot: number) => Promise<boolean>
  /** Lets go of a saved suggestion's confirmation card. */
  dismissSaved: (id: string) => void
  /** Saved workflows changed somewhere else (e.g. one was removed). */
  workflowsChanged: () => void
}

/** Suggestions saved this session whose confirmation is still on screen. */
let pinned: Suggestion[] = []

/** The pending list from main, with pinned (just-saved) cards kept in place. */
function withPinned(pending: Suggestion[]): Suggestion[] {
  const ids = new Set(pending.map((suggestion) => suggestion.id))
  return [...pinned.filter((suggestion) => !ids.has(suggestion.id)), ...pending]
}

export const useSuggestionsStore = create<SuggestionsStoreState>((set, get) => ({
  suggestions: [],
  isLoading: true,
  workflowsVersion: 0,
  refresh: async () => {
    set({ isLoading: true })
    const suggestions = await window.flow.getSuggestions()
    set({ suggestions: withPinned(suggestions), isLoading: false })
  },
  subscribe: () => {
    return window.flow.onSuggestionsChanged((suggestions) => {
      set({ suggestions: withPinned(suggestions), isLoading: false })
    })
  },
  resolve: async (id, status, reason) => {
    await window.flow.resolveSuggestion(id, status, reason)
    // Optimistically drop it from the pending list locally — a resolved
    // suggestion is no longer pending, and the next SUGGESTIONS_CHANGED
    // push (if any) will reconcile fully.
    pinned = pinned.filter((suggestion) => suggestion.id !== id)
    set({ suggestions: get().suggestions.filter((suggestion) => suggestion.id !== id) })
  },
  assignToControl: async (id, slot) => {
    const result = await window.flow.assignSuggestionToControl(id, slot)
    if (!result) return false
    const saved = get().suggestions.find((suggestion) => suggestion.id === id)
    if (saved) pinned = [...pinned.filter((item) => item.id !== id), saved]
    set((state) => ({ workflowsVersion: state.workflowsVersion + 1 }))
    return true
  },
  dismissSaved: (id) => {
    pinned = pinned.filter((suggestion) => suggestion.id !== id)
    set({ suggestions: get().suggestions.filter((suggestion) => suggestion.id !== id) })
  },
  workflowsChanged: () => set((state) => ({ workflowsVersion: state.workflowsVersion + 1 }))
}))
