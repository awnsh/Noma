import type { DetectedPattern, Suggestion, WorkflowNotice } from '@shared/types'
import {
  getPendingSuggestions,
  markSuggestionNotified,
  recordSuggestionOccurrences,
  resolveSuggestion
} from '../database/repositories/suggestionsRepository'
import { hideWorkflowNotice, showWorkflowNotice } from './notificationWindow'
import { pickWorkflowToNotify, type NotificationCandidate } from './notificationPolicy'

/**
 * The layer between Flow noticing a workflow and Noma saying so out loud.
 *
 * It owns only the wiring: the actual "has this earned an interruption"
 * judgement lives in notificationPolicy.ts, deliberately pure, so that the
 * rule can be read, tested and retuned without an Electron window or a
 * database anywhere near it.
 *
 * Nothing here changes how workflows are detected. `SuggestionEngine` still
 * decides what a workflow is, what it is worth and whether to suggest it at
 * all; this only asks, of suggestions that already exist, whether one of
 * them deserves to be put in front of someone who is busy.
 */
export class WorkflowNotifier {
  /** Shared across workflows: the cooldown is about how often Noma speaks,
   *  not about any one workflow. Deliberately in memory: a restart is a
   *  natural place to be allowed to speak again, and persisting it would
   *  mean a crash could silence Noma for half an hour. */
  private lastNotifiedAt: number | null = null
  private visibleSuggestionId: string | null = null

  constructor(private readonly onNoticeResolved: () => void) {}

  /**
   * Called after every detection pass with the patterns Flow currently sees.
   *
   * Two jobs, in order: keep every pending suggestion's occurrence count
   * honest (the threshold is meaningless if the count is frozen at whatever
   * it was the first time the workflow appeared), then decide whether any of
   * them has now crossed every bar.
   */
  review(patterns: DetectedPattern[]): void {
    const patternById = new Map(patterns.map((pattern) => [`suggestion:${pattern.id}`, pattern]))
    const pending = getPendingSuggestions()

    const candidates: NotificationCandidate[] = []
    for (const suggestion of pending) {
      const pattern = patternById.get(suggestion.id)
      // A suggestion whose pattern isn't in this pass (it has aged out of
      // today's events) keeps whatever count it last had; it isn't a
      // candidate right now.
      if (!pattern) continue
      recordSuggestionOccurrences(suggestion.id, pattern.count)
      candidates.push({
        suggestionId: suggestion.id,
        kind: pattern.kind,
        status: suggestion.status,
        confidence: suggestion.confidence,
        occurrenceCount: pattern.count,
        notifiedAt: suggestion.notifiedAt ?? null
      })
    }

    const now = Date.now()
    const chosen = pickWorkflowToNotify(candidates, {
      lastNotifiedAt: this.lastNotifiedAt,
      noticeVisible: this.visibleSuggestionId !== null,
      now
    })
    if (!chosen) return

    const suggestion = pending.find((entry) => entry.id === chosen.suggestionId)
    if (!suggestion) return
    this.present({ suggestion, occurrenceCount: chosen.occurrenceCount }, now)
  }

  /** Shows a notice and records that this workflow has now had its turn. */
  present(notice: WorkflowNotice, now = Date.now()): void {
    markSuggestionNotified(notice.suggestion.id, now)
    this.lastNotifiedAt = now
    this.visibleSuggestionId = notice.suggestion.id
    showWorkflowNotice(notice)
  }

  /**
   * The notice is going away.
   *
   * What that means for the workflow depends entirely on why. "Not now" is a
   * real answer and marks it dismissed, so Noma drops the subject without
   * forgetting the workflow itself. A timeout is not an answer: the user may
   * have been looking elsewhere; and neither is closing the card, which
   * answers a question nobody asked about the workflow ("do you want this on
   * screen right now?"). Both leave the suggestion exactly as it was, still
   * waiting in the app.
   */
  dismiss(suggestionId: string, reason: 'timeout' | 'closed' | 'dismissed' | 'reviewed'): void {
    if (this.visibleSuggestionId === suggestionId) this.visibleSuggestionId = null
    hideWorkflowNotice()
    if (reason === 'dismissed') {
      resolveSuggestion(suggestionId, 'dismissed')
      this.onNoticeResolved()
    }
  }

  /**
   * Factory reset ("Delete all data"): forgets the cooldown and takes down
   * any notice on screen, whose suggestion no longer exists. Without this,
   * the first workflow noticed after a reset could stay silenced by a
   * cooldown earned before it, or be blocked behind a "visible" notice
   * for a deleted suggestion that nothing will ever dismiss. The
   * per-workflow "already notified" record lived in the suggestions table,
   * which the reset already wiped.
   */
  reset(): void {
    this.lastNotifiedAt = null
    if (this.visibleSuggestionId !== null) {
      this.visibleSuggestionId = null
      hideWorkflowNotice()
    }
  }

  /** Test seam: what the notifier believes is on screen right now. */
  get visibleId(): string | null {
    return this.visibleSuggestionId
  }

  /** Used by Demo Mode to put a real notice on screen on demand, bypassing
   *  the threshold and cooldown but nothing else: the surface, the data
   *  shape and every interaction are the production ones. */
  simulate(suggestion: Suggestion, occurrenceCount: number): void {
    this.present({ suggestion, occurrenceCount })
  }
}
