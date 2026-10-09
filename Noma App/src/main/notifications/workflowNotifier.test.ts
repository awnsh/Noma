import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DetectedPattern, Suggestion } from '@shared/types'
import { hideWorkflowNotice, showWorkflowNotice } from './notificationWindow'
import { getPendingSuggestions } from '../database/repositories/suggestionsRepository'
import { WorkflowNotifier } from './workflowNotifier'

// The notice window is a real BrowserWindow and the suggestions live in
// SQLite; neither matters to the notifier's own in-memory state, which is
// what's under test here.
vi.mock('./notificationWindow', () => ({ showWorkflowNotice: vi.fn(), hideWorkflowNotice: vi.fn() }))
vi.mock('../database/repositories/suggestionsRepository', () => ({
  getPendingSuggestions: vi.fn(() => []),
  markSuggestionNotified: vi.fn(),
  recordSuggestionOccurrences: vi.fn(),
  resolveSuggestion: vi.fn()
}))

function suggestion(id: string): Suggestion {
  return { id: `suggestion:${id}`, status: 'pending', confidence: 0.9, notifiedAt: null } as unknown as Suggestion
}

function pattern(id: string): DetectedPattern {
  return { id, kind: 'crossAppWorkflow', applicationId: null, description: '', count: 5 } as unknown as DetectedPattern
}

beforeEach(() => {
  vi.mocked(showWorkflowNotice).mockClear()
  vi.mocked(hideWorkflowNotice).mockClear()
})

describe('WorkflowNotifier.reset (factory reset)', () => {
  it('takes down a visible notice and forgets the cooldown, so the next workflow can be announced', () => {
    const notifier = new WorkflowNotifier(() => {})
    notifier.present({ suggestion: suggestion('old'), occurrenceCount: 5 })
    expect(notifier.visibleId).toBe('suggestion:old')

    // Without a reset: the old notice blocks, and after it the cooldown does.
    vi.mocked(getPendingSuggestions).mockReturnValue([suggestion('new')])
    notifier.dismiss('suggestion:old', 'timeout')
    notifier.review([pattern('new')])
    expect(showWorkflowNotice).toHaveBeenCalledTimes(1) // only the first present()

    notifier.reset()
    expect(notifier.visibleId).toBeNull()
    notifier.review([pattern('new')])
    expect(showWorkflowNotice).toHaveBeenCalledTimes(2)
    expect(notifier.visibleId).toBe('suggestion:new')
  })

  it('hides a notice still on screen', () => {
    const notifier = new WorkflowNotifier(() => {})
    notifier.present({ suggestion: suggestion('old'), occurrenceCount: 5 })
    notifier.reset()
    expect(hideWorkflowNotice).toHaveBeenCalledTimes(1)
    expect(notifier.visibleId).toBeNull()
  })
})
