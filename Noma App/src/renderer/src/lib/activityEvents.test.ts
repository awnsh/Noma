import { describe, expect, it } from 'vitest'
import type { Suggestion } from '@shared/types'
import { activityEventsFromSuggestions } from './activityEvents'

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 's1',
    title: 't',
    explanation: 'e',
    confidence: 0.6,
    status: 'pending',
    createdAt: 1000,
    applicationId: 'code',
    ...overrides
  }
}

describe('activityEventsFromSuggestions', () => {
  it('emits a detection event for every suggestion', () => {
    const events = activityEventsFromSuggestions([suggestion()])
    expect(events).toHaveLength(1)
    expect(events[0].description).toBe('Noma noticed a pattern across your apps.')
  })

  it('names the detection differently per action kind', () => {
    const events = activityEventsFromSuggestions([
      suggestion({
        id: 'a',
        action: { kind: 'createWorkflowMacroAndAssignToControl', steps: [] }
      })
    ])
    expect(events[0].description).toBe('Noma detected a repeated workflow.')
  })

  it('adds a second event once a suggestion was actually accepted', () => {
    const events = activityEventsFromSuggestions([
      suggestion({
        status: 'accepted',
        resolvedAt: 2000,
        applicationName: 'Visual Studio Code',
        action: { kind: 'assignShortcutToControl', comboKeys: ['Control', 'S'] }
      })
    ])
    expect(events).toHaveLength(2)
    expect(events.some((e) => e.description === 'You turned it into an action for Visual Studio Code.')).toBe(
      true
    )
  })

  it('does not add a second event for a rejected or dismissed suggestion', () => {
    const events = activityEventsFromSuggestions([suggestion({ status: 'rejected', resolvedAt: 2000 })])
    expect(events).toHaveLength(1)
  })

  it('sorts events most-recent-first', () => {
    const events = activityEventsFromSuggestions([
      suggestion({ id: 'old', createdAt: 1000 }),
      suggestion({ id: 'new', createdAt: 5000 })
    ])
    expect(events.map((e) => e.id)).toEqual(['new:detected', 'old:detected'])
  })
})
