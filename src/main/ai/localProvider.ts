import type { DetectedPattern, PatternKind, Suggestion } from '@shared/types'
import type { AIProvider } from './types'
import { suggestionForPattern } from './suggestionRules'

/** What LocalRuleBasedProvider needs about a pattern kind's past
 *  accept/reject record — same shape as suggestionsRepository's
 *  SuggestionHistory, restated here so this file doesn't import across the
 *  main-process/database boundary just for a type. */
export interface PatternHistory {
  accepted: number
  rejected: number
  bias: number
}

/**
 * LocalRuleBasedProvider — the MVP suggestion engine (brainstorm.md
 * sections 11-13). Deterministic/statistical, not an LLM, and requires no
 * API key.
 *
 * `getHistory` is injected rather than queried directly so this class stays
 * testable without a database: production wiring passes a function backed
 * by suggestionsRepository.getSuggestionHistoryForKind (the "UPDATE USER
 * MODEL / IMPROVE FUTURE SUGGESTIONS" step of the learning loop, section
 * 14); tests can pass nothing and get an unbiased, history-free `0` for
 * every kind.
 */
export class LocalRuleBasedProvider implements AIProvider {
  readonly name = 'local-rule-based'

  constructor(
    private readonly getHistory: (kind: PatternKind) => PatternHistory = () => ({
      accepted: 0,
      rejected: 0,
      bias: 0
    })
  ) {}

  async generateSuggestions(patterns: DetectedPattern[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    for (const pattern of patterns) {
      const history = this.getHistory(pattern.kind)
      const suggestion = suggestionForPattern(pattern, history.bias, {
        accepted: history.accepted,
        rejected: history.rejected
      })
      if (suggestion) suggestions.push(suggestion)
    }
    return suggestions
  }
}
