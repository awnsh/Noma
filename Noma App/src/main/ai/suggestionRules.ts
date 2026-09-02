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
 *
 * `applicationName` is the application's real display name (e.g. "Visual
 * Studio Code"), resolved by the caller — this function stays pure/DB-free
 * (see the class doc above), so it can't look the name up itself. Falls
 * back to the raw `applicationId` (e.g. "code") when the caller doesn't
 * have one, rather than silently dropping the app context.
 */
export function suggestionForPattern(
  pattern: DetectedPattern,
  confidenceBias = 0,
  priorHistory: { accepted: number; rejected: number } = { accepted: 0, rejected: 0 },
  applicationName: string | null = null
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
        explanation: `You've used ${combo} ${pattern.count} times${appSuffix(pattern.applicationId, applicationName)} today. Assigning it to one of your 4 controls means one press instead of the full shortcut.`,
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
        explanation: `You've repeated ${first} → ${second} ${pattern.count} times${appSuffix(pattern.applicationId, applicationName)} today. Flow could turn this into a one-press macro on one of your 4 controls.`,
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

function appSuffix(applicationId: string | null, applicationName: string | null): string {
  if (!applicationId) return ''
  // Prefer the real display name ("Visual Studio Code") when the caller
  // resolved one; fall back to the raw id ("code") rather than dropping
  // the app context entirely when it hasn't been (or can't be — a pattern
  // from an application Flow hasn't recorded a name for yet).
  return ` in ${applicationName ?? applicationId}`
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
