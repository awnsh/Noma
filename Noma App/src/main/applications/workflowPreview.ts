import type { MacroStep, Suggestion, WorkflowPreview, WorkflowPreviewStep } from '@shared/types'
import { getApplicationById } from '../database/repositories/applicationsRepository'
import { isBlockedShortcut } from '../actions/actionExecutor'
import { describeClickTarget } from '../workflow/clickTarget'
import { shortcutDisplayLabel } from '../workflow/patternDetection'
import { isMac } from '../platform'
import { buildWorkflowMacroSteps } from './suggestionResolution'

/** "Control+Shift+F" as people write it: "Ctrl+Shift+F" (Win / Cmd for Meta). */
export function formatCombo(keys: string[]): string {
  return keys
    .map((key) => (key === 'Control' ? 'Ctrl' : key === 'Meta' ? (isMac ? 'Cmd' : 'Win') : key))
    .join('+')
}

/** The steps a suggestion's action would save, exactly as they'd run. */
function stepsFor(suggestion: Suggestion): MacroStep[] | null {
  const action = suggestion.action
  if (!action) return null
  switch (action.kind) {
    case 'assignShortcutToControl':
      return [{ type: 'shortcut', keys: action.comboKeys }]
    case 'createMacroAndAssignToControl':
      return action.sequence.map((combo) => ({ type: 'shortcut' as const, keys: combo.split('+') }))
    case 'createWorkflowMacroAndAssignToControl':
      return buildWorkflowMacroSteps(action.steps, action.stepDelaysMs)
  }
}

function describe(step: MacroStep, applicationId: string | null): WorkflowPreviewStep {
  switch (step.type) {
    case 'shortcut': {
      const combo = formatCombo(step.keys)
      const name = shortcutDisplayLabel(step.keys, applicationId)
      return {
        kind: 'shortcut',
        description: name === step.keys.join('+') ? `Press ${combo}` : `${name} (${combo})`,
        ...(isBlockedShortcut(step.keys)
          ? { warning: 'Noma never sends shortcuts that can close or quit an app, so this step will stop the workflow.' }
          : {})
      }
    }
    case 'focusApplication': {
      const application = step.applicationId ? getApplicationById(step.applicationId) : null
      return application
        ? { kind: 'focus', description: `Switch to ${application.name} (it has to be open already)` }
        : {
            kind: 'focus',
            description: 'Switch to another app',
            warning: 'Noma doesn’t know which app this was, so this step will stop the workflow.'
          }
    }
    case 'click':
      return step.target.startsWith('label:')
        ? { kind: 'click', description: `Click ${describeClickTarget(step.target)} (found again by name)` }
        : {
            kind: 'click',
            description: `Click ${describeClickTarget(step.target)}`,
            warning: 'This app has no named buttons there, so the click goes by position and can miss if the window looks different.'
          }
    case 'delay':
      return { kind: 'wait', description: `Wait ${(step.ms / 1000).toFixed(1)} s, like you did` }
    default:
      return { kind: 'other', description: step.type, warning: 'Noma can’t replay this kind of step yet.' }
  }
}

/**
 * Exactly what accepting a suggestion would save and later run, in plain
 * words, with every step Noma can already tell won't replay reliably
 * flagged. Shown before the user agrees to anything.
 */
export function previewSuggestion(suggestion: Suggestion): WorkflowPreview | null {
  const steps = stepsFor(suggestion)
  if (!steps) return null
  const applicationId = suggestion.applicationId ?? null
  const described = steps.map((step) => describe(step, applicationId))

  // A workflow ending in a paste gets an Enter appended (see
  // buildWorkflowMacroSteps). The user never pressed it as part of the
  // pattern Noma saw, so say so.
  const action = suggestion.action
  const last = steps[steps.length - 1]
  if (
    action?.kind === 'createWorkflowMacroAndAssignToControl' &&
    last?.type === 'shortcut' &&
    last.keys.length === 1 &&
    last.keys[0] === 'Enter'
  ) {
    described[described.length - 1] = {
      kind: 'shortcut',
      description: 'Press Enter, to send what was pasted',
      added: true
    }
  }

  return { steps: described, replayable: described.every((step) => !step.warning) }
}
