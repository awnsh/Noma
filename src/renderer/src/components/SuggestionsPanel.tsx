import { useEffect } from 'react'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { SuggestionCard } from './SuggestionCard'

export function SuggestionsPanel() {
  const { suggestions, refresh, subscribe, resolve } = useSuggestionsStore()

  useEffect(() => {
    refresh()
    const unsubscribe = subscribe()
    return unsubscribe
  }, [refresh, subscribe])

  if (suggestions.length === 0) {
    return null
  }

  return (
    <section className="mb-10">
      <div className="mb-1 text-xs uppercase tracking-widest text-neutral-500">Suggestions</div>
      <p className="mb-3 text-xs text-neutral-600">
        Accept picks which of your 4 controls it replaces — Flow never assigns one on its own.
      </p>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onReject={(id) => resolve(id, 'rejected')}
            onDismiss={(id) => resolve(id, 'dismissed')}
          />
        ))}
      </div>
    </section>
  )
}
