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
 */
export function suggestionForPattern(
  pattern: DetectedPattern,
  confidenceBias = 0
): Suggestion | null {
  const now = Date.now()

  switch (pattern.kind) {
    case 'repeatedShortcut': {
      const combo = pattern.comboKeys.join('+')
      return {
        id: `suggestion:${pattern.id}`,
        title: `Assign ${combo} to a Flow control?`,
        explanation: `You've used ${combo} ${pattern.count} times${appSuffix(pattern.applicationId)} today. Assigning it to one of your 4 controls means one press instead of the full shortcut.`,
        confidence: clampConfidence(
          baseConfidence(pattern.count, REPEATED_SHORTCUT_THRESHOLD) + confidenceBias
        ),
        status: 'pending',
        createdAt: now,
        applicationId: pattern.applicationId,
        action: { kind: 'assignShortcutToControl', comboKeys: pattern.comboKeys }
      }
    }

    case 'repeatedSequence': {
      const [first, second] = pattern.sequence
      return {
        id: `suggestion:${pattern.id}`,
        title: 'Create a macro for this sequence?',
        explanation: `You've repeated ${first} → ${second} ${pattern.count} times${appSuffix(pattern.applicationId)} today. Flow could turn this into a one-press macro on one of your 4 controls.`,
        confidence: clampConfidence(
          baseConfidence(pattern.count, SEQUENCE_THRESHOLD) + confidenceBias
        ),
        status: 'pending',
        createdAt: now,
        applicationId: pattern.applicationId,
        action: { kind: 'createMacroAndAssignToControl', sequence: pattern.sequence }
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
