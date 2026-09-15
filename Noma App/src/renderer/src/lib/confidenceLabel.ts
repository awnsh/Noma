/**
 * A qualitative read of a suggestion's confidence — "Noma noticed a strong
 * pattern" rather than "Confidence: 87%." The real number still exists
 * (`Suggestion.confidence`, `explainConfidence`'s full breakdown) and stays
 * available behind the Noma Moment's "Why?" disclosure for anyone who wants
 * it; this is just what a normal user sees by default. See the product
 * brief: "Confidence can be shown indirectly unless it is genuinely useful."
 */
export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return 'Noma noticed a strong pattern'
  if (confidence >= 0.5) return 'Noma noticed a pattern'
  return 'Noma noticed a possible pattern'
}
