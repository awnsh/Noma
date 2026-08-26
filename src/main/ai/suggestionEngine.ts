import { detectPatterns } from '../workflow/patternDetection'
import { getWorkflowEventsSince } from '../database/repositories/workflowEventsRepository'
import { insertSuggestionIfNew } from '../database/repositories/suggestionsRepository'
import { startOfTodayMs } from '../workflow/timeWindows'
import type { AIProvider } from './types'

/**
 * Orchestrates the OBSERVE -> IDENTIFY PATTERN -> GENERATE SUGGESTION half
 * of the learning loop (brainstorm.md section 14): reads today's already-
 * captured workflow events, runs deterministic pattern detection over
 * them, hands the results to whichever AIProvider is configured, and
 * persists any new suggestions. Safe to call repeatedly and often —
 * `insertSuggestionIfNew` is a no-op for a pattern already suggested
 * (pending, accepted, rejected, or dismissed), so this never spams
 * duplicates or resurrects a decision the user already made.
 */
export class SuggestionEngine {
  constructor(private readonly provider: AIProvider) {}

  async refresh(): Promise<void> {
    const events = getWorkflowEventsSince(startOfTodayMs())
    const patterns = detectPatterns(events)
    const suggestions = await this.provider.generateSuggestions(patterns)
    for (const suggestion of suggestions) {
      insertSuggestionIfNew(suggestion)
    }
  }
}
