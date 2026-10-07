import {
  NOTIFIABLE_PATTERN_KINDS,
  WORKFLOW_NOTIFICATION_COOLDOWN_MS,
  WORKFLOW_NOTIFICATION_MIN_CONFIDENCE,
  WORKFLOW_NOTIFICATION_THRESHOLD
} from '@shared/constants'
import type { PatternKind, SuggestionStatus } from '@shared/types'

/**
 * Whether Noma has earned the right to interrupt.
 *
 * Kept pure; no database, no window, no clock of its own; because this is
 * the part of the feature that has to be *right*, and the part most likely
 * to be tuned later. Everything that touches Electron or SQLite lives in
 * workflowNotifier.ts and calls in here for the decision.
 *
 * The bar is deliberately high. A suggestion appearing in the app's own
 * Suggestions panel costs the user nothing; they see it when they choose
 * to look. A surface that floats over whatever they are actually doing
 * costs them attention every single time, so it has to clear several
 * independent hurdles rather than one.
 */

export interface NotificationCandidate {
  suggestionId: string
  kind: PatternKind | null
  status: SuggestionStatus
  confidence: number
  /** How many times Flow has now observed this workflow. */
  occurrenceCount: number
  /** When this exact workflow was last announced, if ever. */
  notifiedAt: number | null
}

export interface NotificationState {
  /** When any workflow notice was last shown (the shared cooldown). */
  lastNotifiedAt: number | null
  /** True while a notice is still on screen; never stack two. */
  noticeVisible: boolean
  now: number
}

/**
 * Why a candidate was passed over. Returned rather than logged so the
 * decision is inspectable from a test and from Developer Mode, instead of
 * "nothing happened and nobody knows why": the same reasoning behind
 * Holo's per-tap outcome line.
 */
export type NotificationVerdict =
  | { notify: true }
  | {
      notify: false
      reason:
        | 'not-a-workflow'
        | 'already-resolved'
        | 'already-notified'
        | 'below-threshold'
        | 'low-confidence'
        | 'cooldown'
        | 'notice-visible'
    }

export function shouldNotifyForWorkflow(
  candidate: NotificationCandidate,
  state: NotificationState
): NotificationVerdict {
  if (!candidate.kind || !NOTIFIABLE_PATTERN_KINDS.includes(candidate.kind)) {
    return { notify: false, reason: 'not-a-workflow' }
  }
  // Accepted, rejected and dismissed all mean the user has already had this
  // conversation. "Not now" (dismissed) keeps the workflow; it stops
  // Noma raising it again unprompted.
  if (candidate.status !== 'pending') return { notify: false, reason: 'already-resolved' }
  if (candidate.notifiedAt !== null) return { notify: false, reason: 'already-notified' }
  if (candidate.occurrenceCount < WORKFLOW_NOTIFICATION_THRESHOLD) {
    return { notify: false, reason: 'below-threshold' }
  }
  if (candidate.confidence < WORKFLOW_NOTIFICATION_MIN_CONFIDENCE) {
    return { notify: false, reason: 'low-confidence' }
  }
  // Checked last, so a candidate that is merely early doesn't read as
  // "blocked by the cooldown" when the cooldown had nothing to do with it.
  if (state.noticeVisible) return { notify: false, reason: 'notice-visible' }
  if (state.lastNotifiedAt !== null && state.now - state.lastNotifiedAt < WORKFLOW_NOTIFICATION_COOLDOWN_MS) {
    return { notify: false, reason: 'cooldown' }
  }
  return { notify: true }
}

/**
 * The one candidate to announce out of everything Flow currently knows
 * the most-repeated, then the most confident. Returns null when none of
 * them has earned it, which is the overwhelmingly common case.
 */
export function pickWorkflowToNotify(
  candidates: NotificationCandidate[],
  state: NotificationState
): NotificationCandidate | null {
  return (
    [...candidates]
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount || b.confidence - a.confidence)
      .find((candidate) => shouldNotifyForWorkflow(candidate, state).notify) ?? null
  )
}
