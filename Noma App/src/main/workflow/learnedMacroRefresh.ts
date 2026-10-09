import type { DetectedPattern, MacroStep } from '@shared/types'
import { getAllMacros, isLearnedMacroTrigger, updateMacro } from '../database/repositories/macrosRepository'
import { buildWorkflowMacroSteps } from './macroSteps'
import { withoutScreenshotOverlaySteps } from './screenshotRegions'

/** What a step does, without its tab, area or timing: two steps with the
 *  same skeleton are the same action. */
function skeleton(step: MacroStep): string {
  switch (step.type) {
    case 'shortcut':
      return `key:${step.keys.join('+')}`
    case 'focusApplication':
      return `app:${step.applicationId}`
    case 'click':
      return `click:${step.target}`
    default:
      return step.type
  }
}

function actionsOf(steps: MacroStep[]): MacroStep[] {
  return withoutScreenshotOverlaySteps(steps).filter((step) => step.type !== 'delay')
}

/**
 * Fills in what a saved learned workflow is missing, from the latest
 * observations of the same workflow: the browser tab each step happened in
 * and the area its screenshot covers (both recorded only since 0.1.18). Flow
 * never suggests a workflow twice, so without this a workflow saved before
 * then could never get them.
 *
 * Only a learned macro whose steps are exactly the pattern's (same actions,
 * same order; pauses and the hand-worked snipping overlay don't count) is
 * touched. A tab follows the latest agreement (habits change); an area is
 * only added, never replaced, so one picked in Macro Studio stays. Returns
 * how many macros changed.
 */
export function refreshLearnedMacros(patterns: DetectedPattern[]): number {
  const fresh = patterns
    .filter((pattern) => pattern.kind === 'multiStepWorkflow')
    .map((pattern) => actionsOf(buildWorkflowMacroSteps(pattern.steps, pattern.stepDelaysMs)))
    .filter((steps) => steps.some((step) => (step.type === 'shortcut' || step.type === 'focusApplication') && (step.tab || ('region' in step && step.region))))
  if (fresh.length === 0) return 0

  let changedCount = 0
  for (const macro of getAllMacros()) {
    if (!isLearnedMacroTrigger(macro.trigger)) continue
    const saved = actionsOf(macro.actions)
    const shape = saved.map(skeleton).join('|')
    const match = fresh.find((steps) => steps.map(skeleton).join('|') === shape)
    if (!match) continue

    let changed = false
    const actions = macro.actions.map((step) => {
      const index = saved.indexOf(step)
      if (index === -1) return step
      const learned = match[index]
      if (step.type === 'shortcut' && learned.type === 'shortcut') {
        const next = { ...step }
        if (learned.tab && step.tab !== learned.tab) next.tab = learned.tab
        if (learned.region && !step.region) next.region = learned.region
        if (next.tab !== step.tab || next.region !== step.region) {
          changed = true
          return next
        }
      }
      if (step.type === 'focusApplication' && learned.type === 'focusApplication' && learned.tab && step.tab !== learned.tab) {
        changed = true
        return { ...step, tab: learned.tab }
      }
      return step
    })
    if (changed) {
      updateMacro(macro.id, { actions })
      changedCount++
    }
  }
  return changedCount
}
