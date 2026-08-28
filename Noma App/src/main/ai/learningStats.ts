import type { LearningStats, PatternKind } from '@shared/types'
import { REPEATED_SHORTCUT_THRESHOLD, SEQUENCE_THRESHOLD } from '../workflow/patternDetection'

/** What generates a `getHistory` callback needs to know about a pattern
 *  kind — same shape as suggestionsRepository's SuggestionHistory, restated
 *  here so this file doesn't import across the main-process/database
 *  boundary just for a type (same reasoning as localProvider.ts's
 *  PatternHistory). */
interface PatternHistory {
  accepted: number
  rejected: number
  bias: number
}

/**
 * The static "how it works" half of the Flow Learning Center's per-kind
 * cards — kept here (not derived from patternDetection.ts's exports alone)
 * because the human-readable label/description belongs with the feature
 * that displays them, not with the pure pattern-detection math.
 * `frequentControl` is deliberately excluded: it never produces a
 * suggestion (see suggestionRules.ts), so it has no accept/reject history
 * or bias to show here.
 */
const ACTIONABLE_KIND_INFO: Array<{
  kind: PatternKind
  label: string
  description: string
  threshold: number
}> = [
  {
    kind: 'repeatedShortcut',
    label: 'Repeated shortcuts',
    description: 'A keyboard shortcut used several times today that isn’t yet assigned to a control.',
    threshold: REPEATED_SHORTCUT_THRESHOLD
  },
  {
    kind: 'repeatedSequence',
    label: 'Repeated sequences',
    description: 'Two shortcuts used back-to-back, repeatedly, within a 15-second window.',
    threshold: SEQUENCE_THRESHOLD
  }
]

/**
 * Builds the Flow Learning Center's stats — pure and injected with a
 * history lookup (same pattern as LocalRuleBasedProvider) so it's testable
 * without a database.
 */
export function getLearningStats(getHistory: (kind: PatternKind) => PatternHistory): LearningStats {
  return {
    kinds: ACTIONABLE_KIND_INFO.map((info) => {
      const history = getHistory(info.kind)
      return {
        kind: info.kind,
        label: info.label,
        description: info.description,
        threshold: info.threshold,
        accepted: history.accepted,
        rejected: history.rejected,
        bias: history.bias
      }
    })
  }
}
