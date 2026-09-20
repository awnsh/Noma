import type { DetectedPattern, MacroStep, Suggestion, WorkflowStep } from '@shared/types'
import { formatShortcutCaption } from './describeAction'

/**
 * One step in a visualized workflow chain — "Screenshot → Claude Code →
 * Paste" — shared by every place that shows a workflow visually
 * (`WorkflowChain`, the Noma Moment's hero, Activity rows). `kind`
 * distinguishes an application step (gets an `AppIcon` — real computer
 * behavior, not a generic tag) from a shortcut step (set in mono, no
 * icon). `applicationId` rides along on an `app` step purely so `AppIcon`
 * can resolve a real logo when one exists (see `lib/appIcons.ts`) — it's
 * `undefined` for a `shortcut` step and for an `app` step Flow never
 * resolved an id for. Pure and derived entirely from data the suggestion
 * already carries (`action` + `chainApplicationNames`); never invents a
 * step, never hardcodes an application name or fabricates an icon.
 */
export interface WorkflowChainStep {
  label: string
  kind: 'app' | 'shortcut'
  applicationId?: string
}

/**
 * A small, renderer-local mirror of `shortcutDisplayLabel`
 * (main/workflow/patternDetection.ts) — the renderer can't import main-
 * process code, so this is intentionally duplicated in miniature, the same
 * way `describeAction.ts` already keeps its own presentation-only copy of
 * action semantics separate from actionExecutor.ts's.
 */
const SHORTCUT_STEP_LABELS: Record<string, string> = {
  'Meta+Shift+S': 'Screenshot',
  'Control+V': 'Paste',
  'Control+C': 'Copy',
  'Control+X': 'Cut',
  Enter: 'Enter'
}

export function shortcutStepLabel(comboKeys: string[]): string {
  const combo = comboKeys.join('+')
  return SHORTCUT_STEP_LABELS[combo] ?? formatShortcutCaption(comboKeys)
}

function appStepLabel(applicationId: string | null, names: Record<string, string | null> | undefined): string {
  if (!applicationId) return 'another app'
  return names?.[applicationId] ?? applicationId
}

/** Renderer-local mirror of main/workflow/clickTarget.ts's
 *  describeClickTarget — same reasoning as SHORTCUT_STEP_LABELS above. */
function clickStepLabel(target: string): string {
  if (target.startsWith('label:')) return `Click “${target.slice('label:'.length)}”`
  return 'Click on screen'
}

function workflowStep(step: WorkflowStep, names: Record<string, string | null> | undefined): WorkflowChainStep {
  // A click is drawn like a shortcut step (mono label, no app icon) — it's an
  // action inside an app, not a switch to one.
  if (step.type === 'click') return { label: clickStepLabel(step.target), kind: 'shortcut' }
  return step.type === 'shortcut'
    ? { label: shortcutStepLabel(step.comboKeys), kind: 'shortcut' }
    : { label: appStepLabel(step.applicationId, names), kind: 'app', applicationId: step.applicationId ?? undefined }
}

/**
 * The ordered chain for a suggestion, or null if this suggestion's action
 * doesn't represent a visualizable chain (there isn't one for
 * `frequentControl`, and `crossAppWorkflow` has no `action` at all — its
 * `steps`/`closingStep` still come through the pattern, but that kind never
 * reaches here as a `Suggestion.action`, only as raw `DetectedPattern` data
 * the caller doesn't have; see `NomaMoment` for how it falls back to plain
 * text for that kind).
 */
export function workflowChainSteps(suggestion: Suggestion): WorkflowChainStep[] | null {
  const action = suggestion.action
  if (!action) return null

  switch (action.kind) {
    case 'createWorkflowMacroAndAssignToControl':
      return action.steps.map((step) => workflowStep(step, suggestion.chainApplicationNames))
    case 'createMacroAndAssignToControl':
      return action.sequence.map((combo) => ({ label: shortcutStepLabel(combo.split('+')), kind: 'shortcut' }))
    case 'assignShortcutToControl':
      return [{ label: shortcutStepLabel(action.comboKeys), kind: 'shortcut' }]
  }
}

/**
 * The same visual chain, derived directly from a `DetectedPattern` instead
 * of a `Suggestion` — the Learning page's own "what Noma is learning" list
 * (`InsightCard`) shows patterns before they've necessarily become a
 * suggestion with a resolved `action`, so `workflowChainSteps` (which reads
 * `Suggestion.action`) doesn't apply there. Only the two multi-step pattern
 * kinds carry a visualizable `steps` sequence; every other kind returns
 * null, same "no chain to show" convention as `workflowChainSteps`.
 */
export function patternChainSteps(
  pattern: DetectedPattern,
  names: Record<string, string | null>
): WorkflowChainStep[] | null {
  if (pattern.kind !== 'crossAppWorkflow' && pattern.kind !== 'multiStepWorkflow') return null
  return pattern.steps.map((step) => workflowStep(step, names))
}

/**
 * The same visual chain, derived from a saved `Macro`'s steps instead of a
 * live `Suggestion` — what the Controls page shows for a learned action
 * after it's already been created (there's no `Suggestion` left by then,
 * just the resulting `Macro`). `applicationNames` is a caller-resolved
 * id -> display-name lookup (the Controls page already fetches
 * `getAllApplications()` for this); falls back to the raw id when a name
 * isn't known, same convention as the suggestion-side resolver.
 */
export function macroChainSteps(
  steps: MacroStep[],
  applicationNames: Record<string, string | null>
): WorkflowChainStep[] {
  return steps.flatMap((step): WorkflowChainStep[] => {
    switch (step.type) {
      case 'shortcut':
        return [{ label: shortcutStepLabel(step.keys), kind: 'shortcut' }]
      case 'focusApplication':
        return [
          {
            label: applicationNames[step.applicationId] ?? step.applicationId,
            kind: 'app',
            applicationId: step.applicationId
          }
        ]
      default:
        // delay/macro/systemCommand/flowAction/launchApplication steps
        // don't currently appear in a Noma-learned macro (see
        // suggestionResolution.ts's buildWorkflowMacroSteps) — omitted
        // from the visual chain rather than shown as a confusing step.
        return []
    }
  })
}
