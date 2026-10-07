import { useEffect, useState } from 'react'
import type { Suggestion } from '@shared/types'
import { ActivityEventRow } from '../components/ActivityEventRow'
import { EmptyState } from '../components/EmptyState'
import { activityEventsFromSuggestions } from '../lib/activityEvents'

/**
 * Activity: a quiet timeline of what Noma has actually done: when it
 * noticed a pattern, when that became a real action. Not a log of every
 * captured keystroke or app switch (see the privacy note at the bottom),
 * only the moments a user would recognize as Noma doing something.
 */
export function Activity() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)

  useEffect(() => {
    const load = (): void => {
      window.flow.getAllSuggestions().then(setSuggestions)
    }
    load()
    const unsubscribe = window.flow.onSuggestionsChanged(load)
    return unsubscribe
  }, [])

  const events = suggestions ? activityEventsFromSuggestions(suggestions) : null

  return (
    <div className="mx-auto max-w-2xl px-12 py-16">
      <div className="mb-12">
        <h1 className="font-display text-2xl font-semibold text-neutral-100">Activity</h1>
      </div>
      <section className="mb-12">
        {events === null ? (
          <p className="text-sm text-neutral-600">Loading…</p>
        ) : events.length === 0 ? (
          <EmptyState
            title="No activity yet."
            hint="Noma logs what it notices and creates here."
          />
        ) : (
          <div>
            {events.map((event) => (
              <ActivityEventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <p className="max-w-md text-xs leading-relaxed text-neutral-500">
        Noma records workflow patterns needed to personalize your interface, not the content you
        type. It never captures a single keystroke or what's on your screen, only which command
        shortcuts and applications you use, and when.
      </p>
    </div>
  )
}
