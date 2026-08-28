import type { DetectedPattern, Suggestion } from '@shared/types'
import { REPEATED_SHORTCUT_THRESHOLD, SEQUENCE_THRESHOLD } from '../workflow/patternDetection'

/**
 * Turns one detected pattern into one suggestion — the deterministic
 * "rules" behind LocalRuleBasedProvider. Pure and exported separately so
 * it's directly unit-testable without a database or an AIProvider
 * instance.
 *
 * Only repeatedShortcut and repeatedSequence patterns produce a
 * suggestion. frequentControl deliberately does not: "you use this
 * control a lot" isn't an actionable suggestion on its own (the control is
 * already assigned and working as intended) — unlike a raw keyboard
 * shortcut that *isn't* yet bound to anything, which clearly is.
 *
 * `priorHistory` is purely for display — it doesn't feed the confidence
 * math (confidenceBias already carries that), only the confidenceBreakdown
 * attached to the returned suggestion, so "why am I seeing this?" can cite
 * real prior accept/reject counts instead of just the resulting nudge.
 */
export function suggestionForPattern(
  pattern: DetectedPattern,
  confidenceBias = 0,
  priorHistory: { accepted: number; rejected: number } = { accepted: 0, rejected: 0 }
): Suggestion | null {
  const now = Date.now()

  switch (pattern.kind) {
    case 'repeatedShortcut': {
      const combo = pattern.comboKeys.join('+')
      const threshold = REPEATED_SHORTCUT_THRESHOLD
      const base = baseConfidence(pattern.count, threshold)
      return {
        id: `suggestion:${pattern.id}`,
        title: `Assign ${combo} to a Flow control?`,
        explanation: `You've used ${combo} ${pattern.count} times${appSuffix(pattern.applicationId)} today. Assigning it to one of your 4 controls means one press instead of the full shortcut.`,
        confidence: clampConfidence(base + confidenceBias),
        status: 'pending',
        createdAt: now,
        applicationId: pattern.applicationId,
        action: { kind: 'assignShortcutToControl', comboKeys: pattern.comboKeys },
        confidenceBreakdown: {
          occurrenceCount: pattern.count,
          threshold,
          baseConfidence: base,
          historyBias: confidenceBias,
          priorAccepted: priorHistory.accepted,
          priorRejected: priorHistory.rejected
        }
      }
    }

    case 'repeatedSequence': {
      const [first, second] = pattern.sequence
      const threshold = SEQUENCE_THRESHOLD
      const base = baseConfidence(pattern.count, threshold)
      return {
        id: `suggestion:${pattern.id}`,
        title: 'Create a macro for this sequence?',
        explanation: `You've repeated ${first} → ${second} ${pattern.count} times${appSuffix(pattern.applicationId)} today. Flow could turn this into a one-press macro on one of your 4 controls.`,
        confidence: clampConfidence(base + confidenceBias),
        status: 'pending',
        createdAt: now,
        applicationId: pattern.applicationId,
        action: { kind: 'createMacroAndAssignToControl', sequence: pattern.sequence },
        confidenceBreakdown: {
          occurrenceCount: pattern.count,
          threshold,
          baseConfidence: base,
          historyBias: confidenceBias,
          priorAccepted: priorHistory.accepted,
          priorRejected: priorHistory.rejected
        }
      }
    }

    case 'frequentControl':
      return null

    default:
      return null
  }
}

function appSuffix(applicationId: string | null): string {
  return applicationId ? ` in ${applicationId}` : ''
}

/** At the threshold: 0.5 confidence. Each additional occurrence nudges it
 *  up, capped well short of certainty — this is a heuristic, not a fact. */
function baseConfidence(count: number, threshold: number): number {
  const excess = Math.max(0, count - threshold)
  return 0.5 + excess * 0.05
}

function clampConfidence(value: number): number {
  return Math.min(0.95, Math.max(0.05, value))
}
