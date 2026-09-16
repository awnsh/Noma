import type { Suggestion } from '@shared/types'
import type { ActivityEvent } from '../components/ActivityEventRow'

function detectionDescription(suggestion: Suggestion): string {
  switch (suggestion.action?.kind) {
    case 'createWorkflowMacroAndAssignToControl':
      return 'Noma detected a repeated workflow.'
    case 'createMacroAndAssignToControl':
      return 'Noma detected a repeated sequence.'
    case 'assignShortcutToControl':
      return 'Noma noticed a shortcut you use a lot.'
    default:
      return 'Noma noticed a pattern across your apps.'
  }
}

/**
 * Turns real suggestion lifecycle data (already fetched via
 * `getAllSuggestions`) into the Activity timeline's plain-language rows —
 * one event when Noma first noticed a pattern, and one more when it became
 * a real action. Deliberately doesn't surface every raw captured event
 * (that would be the "surveillance-style event log" the product brief
 * explicitly warns against) — only the moments a user would actually
 * recognize as something Noma *did*.
 */
export function activityEventsFromSuggestions(suggestions: Suggestion[]): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const suggestion of suggestions) {
    events.push({
      id: `${suggestion.id}:detected`,
      timestamp: suggestion.createdAt,
      description: detectionDescription(suggestion),
      applicationId: suggestion.applicationId,
      applicationName: suggestion.applicationName
    })

    if (suggestion.status === 'accepted' && suggestion.resolvedAt) {
      events.push({
        id: `${suggestion.id}:accepted`,
        timestamp: suggestion.resolvedAt,
        description: suggestion.applicationName
          ? `You turned it into an action for ${suggestion.applicationName}.`
          : 'You turned it into an action.',
        applicationId: suggestion.applicationId,
        applicationName: suggestion.applicationName
      })
    }
  }

  return events.sort((a, b) => b.timestamp - a.timestamp)
}
