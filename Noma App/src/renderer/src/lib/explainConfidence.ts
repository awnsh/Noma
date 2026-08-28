import type { ConfidenceBreakdown } from '@shared/types'

/**
 * Turns the real numbers behind a suggestion's confidence into a plain-
 * language sentence — never a fabricated "AI reasoning" narrative, since
 * there isn't one: this is exactly what suggestionRules.ts computed.
 * Shared by SuggestionCard's per-suggestion "Why?" toggle and the Flow
 * Learning Center's history list, so the two never explain the same
 * numbers differently.
 */
export function explainConfidence(breakdown: ConfidenceBreakdown): string {
  const basePercent = Math.round(breakdown.baseConfidence * 100)
  const overThreshold = breakdown.occurrenceCount - breakdown.threshold
  const occurrenceSentence =
    overThreshold > 0
      ? `That's ${overThreshold} more than the ${breakdown.threshold} needed to trigger a suggestion at all, giving a base confidence of ${basePercent}%.`
      : `That's exactly the ${breakdown.threshold} needed to trigger a suggestion, giving a base confidence of ${basePercent}%.`

  const priorTotal = breakdown.priorAccepted + breakdown.priorRejected
  const biasPercent = Math.round(breakdown.historyBias * 100)
  const historySentence =
    priorTotal === 0
      ? "Flow hasn't learned a preference for suggestions like this yet — no bias applied."
      : biasPercent === 0
        ? `Flow remembers ${breakdown.priorAccepted} of ${priorTotal} similar suggestion${priorTotal === 1 ? '' : 's'} you've resolved before were accepted — roughly balanced, so no meaningful nudge either way.`
        : `Flow also remembers ${breakdown.priorAccepted} of ${priorTotal} similar suggestion${priorTotal === 1 ? '' : 's'} you've resolved before were accepted, ${
            biasPercent > 0 ? 'adding' : 'subtracting'
          } ${Math.abs(biasPercent)}%.`

  return `Occurred ${breakdown.occurrenceCount} time${breakdown.occurrenceCount === 1 ? '' : 's'} today. ${occurrenceSentence} ${historySentence}`
}
