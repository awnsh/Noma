import { useEffect } from 'react'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { SuggestionCard } from './SuggestionCard'

export function SuggestionsPanel() {
  const { suggestions, isLoading, refresh, subscribe, resolve } = useSuggestionsStore()

  useEffect(() => {
    refresh()
    const unsubscribe = subscribe()
    return unsubscribe
  }, [refresh, subscribe])

  // Nothing to show yet, either way — but never mid-fetch: a "hasn't
  // noticed a pattern yet" that flashes into a real suggestion a moment
  // later reads as broken, not calm.
  if (isLoading) {
    return null
  }

  return (
    <section className="mb-10">
      <div className="mb-1 text-xs uppercase tracking-widest text-neutral-500">Suggestions</div>

      {suggestions.length === 0 ? (
        // The empty state matters here — this is Flow's whole value story,
        // and a bare vanished section reads as "nothing is happening" or
        // "this is broken" rather than "Flow is quietly watching."
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-5">
          <p className="text-sm text-neutral-300">Noma hasn&rsquo;t noticed a pattern yet.</p>
          <p className="mt-1 text-xs text-neutral-500">
            Keep working normally. When Noma sees a repeated action, it&rsquo;ll suggest a dedicated
            control — and explain exactly why.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-neutral-600">
            Accept picks which of your 4 controls it replaces — Flow never assigns one on its own.
            Each confidence percentage is a real number, not a guess — tap &quot;Why?&quot; on any
            suggestion to see it.
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
        </>
      )}
    </section>
  )
}
