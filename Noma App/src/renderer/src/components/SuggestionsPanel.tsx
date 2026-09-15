import { useEffect } from 'react'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { NomaMoment } from './NomaMoment'
import { EmptyState } from './EmptyState'

/**
 * The list form of the Noma Moment — every pending suggestion, most recent
 * first, in `compact` presentation. Home shows only the single most
 * important one (see `pages/Home.tsx`); this is the fuller list, used on
 * the Controls page where more than one might be pending at once.
 */
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
    <section>
      {suggestions.length === 0 ? (
        <EmptyState
          title="Noma hasn't noticed a pattern yet."
          hint="Keep working normally. Noma will surface a workflow here as soon as it sees one repeat."
        />
      ) : (
        <div className="divide-y divide-base-700">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="py-4 first:pt-0 last:pb-0">
              <NomaMoment
                suggestion={suggestion}
                onReject={(id) => resolve(id, 'rejected')}
                onDismiss={(id) => resolve(id, 'dismissed')}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
