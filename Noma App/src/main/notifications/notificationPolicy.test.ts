import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_NOTIFICATION_COOLDOWN_MS,
  WORKFLOW_NOTIFICATION_THRESHOLD
} from '@shared/constants'
import {
  pickWorkflowToNotify,
  shouldNotifyForWorkflow,
  type NotificationCandidate,
  type NotificationState
} from './notificationPolicy'

const NOW = 1_700_000_000_000

const candidate = (overrides: Partial<NotificationCandidate> = {}): NotificationCandidate => ({
  suggestionId: 'suggestion:workflow:1',
  kind: 'multiStepWorkflow',
  status: 'pending',
  confidence: 0.8,
  occurrenceCount: WORKFLOW_NOTIFICATION_THRESHOLD,
  notifiedAt: null,
  ...overrides
})

const state = (overrides: Partial<NotificationState> = {}): NotificationState => ({
  lastNotifiedAt: null,
  noticeVisible: false,
  now: NOW,
  ...overrides
})

describe('shouldNotifyForWorkflow', () => {
  it('notifies for a repeated, confident workflow nobody has been told about', () => {
    expect(shouldNotifyForWorkflow(candidate(), state())).toEqual({ notify: true })
  })

  it('stays quiet until the workflow is a habit, not an event', () => {
    const verdict = shouldNotifyForWorkflow(
      candidate({ occurrenceCount: WORKFLOW_NOTIFICATION_THRESHOLD - 1 }),
      state()
    )
    expect(verdict).toEqual({ notify: false, reason: 'below-threshold' })
  })

  it('never announces the same workflow twice', () => {
    const verdict = shouldNotifyForWorkflow(candidate({ notifiedAt: NOW - 86_400_000 }), state())
    expect(verdict).toEqual({ notify: false, reason: 'already-notified' })
  })

  it.each(['accepted', 'rejected', 'dismissed'] as const)(
    'drops the subject once the user has answered (%s)',
    (status) => {
      expect(shouldNotifyForWorkflow(candidate({ status }), state())).toEqual({
        notify: false,
        reason: 'already-resolved'
      })
    }
  )

  it('leaves single shortcuts to the app, where they cost no attention', () => {
    expect(shouldNotifyForWorkflow(candidate({ kind: 'repeatedShortcut' }), state())).toEqual({
      notify: false,
      reason: 'not-a-workflow'
    })
    expect(shouldNotifyForWorkflow(candidate({ kind: 'frequentControl' }), state())).toEqual({
      notify: false,
      reason: 'not-a-workflow'
    })
  })

  it('does not interrupt over a chain Flow is itself unsure about', () => {
    expect(shouldNotifyForWorkflow(candidate({ confidence: 0.2 }), state())).toEqual({
      notify: false,
      reason: 'low-confidence'
    })
  })

  it('stays quiet for the whole cooldown, then speaks again', () => {
    const justSpoke = state({ lastNotifiedAt: NOW - 60_000 })
    expect(shouldNotifyForWorkflow(candidate(), justSpoke)).toEqual({ notify: false, reason: 'cooldown' })

    const longAgo = state({ lastNotifiedAt: NOW - WORKFLOW_NOTIFICATION_COOLDOWN_MS - 1 })
    expect(shouldNotifyForWorkflow(candidate(), longAgo)).toEqual({ notify: true })
  })

  it('never stacks a second notice on a visible one', () => {
    expect(shouldNotifyForWorkflow(candidate(), state({ noticeVisible: true }))).toEqual({
      notify: false,
      reason: 'notice-visible'
    })
  })

  it('reports the candidate’s own shortcoming ahead of the cooldown', () => {
    // Otherwise a workflow that was too new would be reported as
    // "blocked by the cooldown", and tuning the wrong number is the natural
    // next move after reading that.
    const verdict = shouldNotifyForWorkflow(
      candidate({ occurrenceCount: 1 }),
      state({ lastNotifiedAt: NOW - 1000 })
    )
    expect(verdict).toEqual({ notify: false, reason: 'below-threshold' })
  })
})

describe('pickWorkflowToNotify', () => {
  it('picks the most-repeated workflow, then the most confident', () => {
    const chosen = pickWorkflowToNotify(
      [
        candidate({ suggestionId: 'a', occurrenceCount: 4, confidence: 0.6 }),
        candidate({ suggestionId: 'b', occurrenceCount: 9, confidence: 0.6 }),
        candidate({ suggestionId: 'c', occurrenceCount: 9, confidence: 0.9 })
      ],
      state()
    )
    expect(chosen?.suggestionId).toBe('c')
  })

  it('skips the most-repeated one when it is not eligible', () => {
    const chosen = pickWorkflowToNotify(
      [
        candidate({ suggestionId: 'seen-already', occurrenceCount: 20, notifiedAt: NOW - 1000 }),
        candidate({ suggestionId: 'fresh', occurrenceCount: 5 })
      ],
      state()
    )
    expect(chosen?.suggestionId).toBe('fresh')
  })

  it('returns null when nothing has earned an interruption: the usual case', () => {
    expect(pickWorkflowToNotify([candidate({ occurrenceCount: 1 })], state())).toBeNull()
    expect(pickWorkflowToNotify([], state())).toBeNull()
  })

  it('does not mutate the list it was handed', () => {
    const candidates = [candidate({ suggestionId: 'a', occurrenceCount: 3 }), candidate({ suggestionId: 'b', occurrenceCount: 9 })]
    pickWorkflowToNotify(candidates, state())
    expect(candidates.map((entry) => entry.suggestionId)).toEqual(['a', 'b'])
  })
})
