import type { DetectedPattern, Suggestion, WorkflowStep } from '@shared/types'
import {
  CROSS_APP_WORKFLOW_THRESHOLD,
  MULTI_STEP_WORKFLOW_THRESHOLD,
  REPEATED_SHORTCUT_THRESHOLD,
  SEQUENCE_THRESHOLD,
  shortcutDisplayLabel
} from '../workflow/patternDetection'
import { inAppLabel, matchRealisticWorkflow } from '../workflow/appKnowledge'
import { describeClickTarget } from '../workflow/clickTarget'
import { buildWorkflowMacroSteps, hasRunnableSteps } from '../workflow/macroSteps'

/**
 * Turns one detected pattern into one suggestion: the deterministic
 * "rules" behind LocalRuleBasedProvider. Pure and exported separately so
 * it's directly unit-testable without a database or an AIProvider
 * instance.
 *
 * Only repeatedShortcut and repeatedSequence patterns produce a
 * suggestion. frequentControl deliberately does not: "you use this
 * control a lot" isn't an actionable suggestion on its own (the control is
 * already assigned and working as intended); unlike a raw keyboard
 * shortcut that *isn't* yet bound to anything, which clearly is.
 *
 * `priorHistory` is purely for display; it doesn't feed the confidence
 * math (confidenceBias already carries that), only the confidenceBreakdown
 * attached to the returned suggestion, so "why am I seeing this?" can cite
 * real prior accept/reject counts instead of the resulting nudge.
 *
 * `applicationName` is the application's real display name (e.g. "Visual
 * Studio Code"), resolved by the caller: this function stays pure/DB-free
 * (see the class doc above), so it can't look the name up itself. Falls
 * back to the raw `applicationId` (e.g. "code") when the caller doesn't
 * have one, rather than silently dropping the app context.
 *
 * `chainApplicationNames` is the same idea, pluralized: a crossAppWorkflow
 * pattern can touch several applications at once (its own `applicationIds`),
 * so a single `applicationName` isn't enough to name the whole chain: this
 * is a caller-resolved id -> display-name lookup covering all of them.
 */
export function suggestionForPattern(
  pattern: DetectedPattern,
  confidenceBias = 0,
  priorHistory: { accepted: number; rejected: number } = { accepted: 0, rejected: 0 },
  applicationName: string | null = null,
  chainApplicationNames: Record<string, string | null> = {}
): Suggestion | null {
  const now = Date.now()

  switch (pattern.kind) {
    case 'repeatedShortcut': {
      const rawCombo = pattern.comboKeys.join('+')
      // "Blade (Control+B)" when the app's own name for it is known.
      const label = shortcutDisplayLabel(pattern.comboKeys, pattern.applicationId)
      const combo = label === rawCombo ? rawCombo : `${label} (${rawCombo})`
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
      // Only an app-specific name ("Blade") replaces the raw combo here.
      const [first, second] = pattern.sequence.map(
        (combo) => inAppLabel(pattern.applicationId, combo.split('+')) ?? combo
      )
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

    case 'crossAppWorkflow': {
      // Never offer a workflow that would turn into a macro that does nothing.
      if (!hasRunnableSteps(buildWorkflowMacroSteps(pattern.steps, pattern.stepDelaysMs))) return null
      const threshold = CROSS_APP_WORKFLOW_THRESHOLD
      const base = baseConfidence(pattern.count, threshold)
      const chain = describeChain(pattern.steps, pattern.closingStep, chainApplicationNames)
      const knownChain = matchRealisticWorkflow(pattern.steps.map((step) => step.applicationId))
      // The application the chain *starts* in; same "offer the control
      // where the workflow begins" reasoning multiStepWorkflow's
      // contextApplicationId uses. Once `focusApplication`/click execution
      // existed, "no executable action" stopped being true for this kind
      // see detectCrossAppWorkflows' doc comment, and shared/types'
      // `createWorkflowMacroAndAssignToControl`.
      const startApplicationId = pattern.steps[0].applicationId
      return {
        id: `suggestion:${pattern.id}`,
        title: knownChain
          ? `Flow noticed a workflow across apps: ${knownChain.name}`
          : 'Flow noticed a workflow across apps',
        explanation: `You've repeated ${chain} ${pattern.count} times today. Turn it into one action?`,
        confidence: clampConfidence(base + confidenceBias),
        status: 'pending',
        createdAt: now,
        applicationId: startApplicationId,
        action: { kind: 'createWorkflowMacroAndAssignToControl', steps: pattern.steps, stepDelaysMs: pattern.stepDelaysMs },
        chainApplicationNames,
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

    case 'multiStepWorkflow': {
      if (!hasRunnableSteps(buildWorkflowMacroSteps(pattern.steps, pattern.stepDelaysMs))) return null
      const threshold = MULTI_STEP_WORKFLOW_THRESHOLD
      // Consistency (how many occurrences matched the chain's typical shape
      // exactly, vs. only approximately) tempers confidence without
      // dominating it: a chain seen 8 times at 75% consistency is still a
      // real workflow, slightly less certain than one seen identically
      // every time.
      const base = baseConfidence(pattern.count, threshold) * (0.85 + 0.15 * pattern.consistency)
      const chain = pattern.steps.map((step) => describeWorkflowStep(step, chainApplicationNames)).join(' → ')
      // A recognized real-world workflow ("Run and preview") is named in the
      // title, so the card says what Noma understood, not what it saw.
      const known = matchRealisticWorkflow(pattern.steps.map((step) => step.applicationId))

      return {
        id: `suggestion:${pattern.id}`,
        title: known ? `Noma noticed a workflow: ${known.name}` : 'Noma noticed a workflow',
        explanation: `You frequently do this: ${chain}. Detected ${pattern.count} times recently. Turn it into one action?`,
        confidence: clampConfidence(base + confidenceBias),
        status: 'pending',
        createdAt: now,
        // Offered alongside the other controls for the app the chain starts
        // in: see the field's own doc comment in shared/types.
        applicationId: pattern.contextApplicationId,
        action: {
          kind: 'createWorkflowMacroAndAssignToControl',
          steps: pattern.steps,
          stepDelaysMs: pattern.stepDelaysMs
        },
        chainApplicationNames,
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

/** Resolves one step to display text, preferring the caller-resolved name
 *  for an appSwitch step and falling back to the raw id; same fallback
 *  convention as appSuffix below, per-step instead of per-suggestion.
 *  A shortcut step prefers its human label ("Paste") over the raw combo
 *  see shortcutDisplayLabel. */
function describeWorkflowStep(step: WorkflowStep, names: Record<string, string | null>): string {
  if (step.type === 'shortcut') return shortcutDisplayLabel(step.comboKeys, step.applicationId)
  if (step.type === 'click') return `Click ${describeClickTarget(step.target)}`
  if (!step.applicationId) return 'another app'
  return names[step.applicationId] ?? step.applicationId
}

function describeChain(
  steps: [WorkflowStep, WorkflowStep],
  closingStep: WorkflowStep | undefined,
  names: Record<string, string | null>
): string {
  const parts = steps.map((step) => describeWorkflowStep(step, names))
  if (closingStep) parts.push(`then ${describeWorkflowStep(closingStep, names)}`)
  return parts.join(' → ')
}

function appSuffix(applicationId: string | null, applicationName: string | null): string {
  if (!applicationId) return ''
  // Prefer the real display name ("Visual Studio Code") when the caller
  // resolved one; fall back to the raw id ("code") rather than dropping
  // the app context entirely when it hasn't been (or can't be: a pattern
  // from an application Flow hasn't recorded a name for yet).
  return ` in ${applicationName ?? applicationId}`
}

/** At the threshold: 0.5 confidence. Each additional occurrence nudges it
 *  up, capped well short of certainty: this is a heuristic, not a fact. */
function baseConfidence(count: number, threshold: number): number {
  const excess = Math.max(0, count - threshold)
  return 0.5 + excess * 0.05
}

function clampConfidence(value: number): number {
  return Math.min(0.95, Math.max(0.05, value))
}
