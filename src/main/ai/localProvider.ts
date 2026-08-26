import type { DetectedPattern, PatternKind, Suggestion } from '@shared/types'
import type { AIProvider } from './types'
import { suggestionForPattern } from './suggestionRules'

/**
 * LocalRuleBasedProvider — the MVP suggestion engine (brainstorm.md
 * sections 11-13). Deterministic/statistical, not an LLM, and requires no
 * API key.
 *
 * `getConfidenceBias` is injected rather than queried directly so this
 * class stays testable without a database: production wiring passes a
 * function backed by suggestionsRepository's historical accept/reject
 * counts (the "UPDATE USER MODEL / IMPROVE FUTURE SUGGESTIONS" step of the
 * learning loop, section 14); tests can pass nothing and get an unbiased
 * `0` for every kind.
 */
export class LocalRuleBasedProvider implements AIProvider {
  readonly name = 'local-rule-based'

  constructor(private readonly getConfidenceBias: (kind: PatternKind) => number = () => 0) {}

  async generateSuggestions(patterns: DetectedPattern[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    for (const pattern of patterns) {
      const suggestion = suggestionForPattern(pattern, this.getConfidenceBias(pattern.kind))
      if (suggestion) suggestions.push(suggestion)
    }
    return suggestions
  }
}
