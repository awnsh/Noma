import type { DetectedPattern } from '@shared/types'
import { shortcutStepLabel } from './workflowChain'

/**
 * A plain-language sentence for a cross-app or multi-step
 * `DetectedPattern` — the Learning page's "what Noma noticed today" list.
 * `appNames` is an optional caller-resolved id -> display-name map (the
 * Learning page fetches `getAllApplications()` once for this); falls back
 * to the raw application id when a name isn't known.
 */
export function workflowStepPlainText(
  pattern: DetectedPattern,
  appNames: Record<string, string | null> = {}
): string {
  const appName = (id: string | null): string => (id ? (appNames[id] ?? id) : 'another app')

  if (pattern.kind === 'crossAppWorkflow') {
    const apps = [...new Set(pattern.applicationIds.filter((id): id is string => id !== null))].map(appName)
    return apps.length >= 2
      ? `You frequently switch between ${apps.join(' and ')}.`
      : pattern.description
  }

  if (pattern.kind === 'multiStepWorkflow') {
    const chain = pattern.steps
      .map((step) => (step.type === 'shortcut' ? shortcutStepLabel(step.comboKeys) : appName(step.applicationId)))
      .join(' → ')
    return `You've repeated ${chain} ${pattern.count} time${pattern.count === 1 ? '' : 's'} today.`
  }

  return pattern.description
}
