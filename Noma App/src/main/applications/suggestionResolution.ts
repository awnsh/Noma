import type { ApplicationProfile, MacroStep, Suggestion, WorkflowStep } from '@shared/types'
import { DEMO_MACRO_TRIGGER, LEARNED_MACRO_TRIGGER } from '@shared/constants'
import { getDatabase } from '../database/db'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { collectReplacedMacro } from './controlEditing'
import { assignControlAction, toDisplayLabel } from '../database/repositories/controlsRepository'
import { createMacro } from '../database/repositories/macrosRepository'
import { getSuggestionById, resolveSuggestion } from '../database/repositories/suggestionsRepository'
import { describeStep } from '../workflow/patternDetection'
import { buildWorkflowMacroSteps, hasRunnableSteps } from '../workflow/macroSteps'

/**
 * Accepts a suggestion by writing its action onto a control slot the user
 * explicitly picked: the only place a suggestion actually changes a
 * profile. Deliberately conservative: never called automatically, never
 * picks a slot itself, and fails closed (returns null) rather than
 * guessing when the suggestion, its application's profile, or the
 * requested slot doesn't check out. One transaction (see below): on any
 * null nothing is written. A learned workflow the slot held before is
 * deleted if nothing else still uses it (collectReplacedMacro).
 */
export function assignSuggestionToControl(
  suggestionId: string,
  slot: number
): { suggestion: Suggestion; profile: ApplicationProfile } | null {
  const suggestion = getSuggestionById(suggestionId)
  if (!suggestion || suggestion.status !== 'pending') return null
  if (!suggestion.applicationId || !suggestion.action) return null

  const profile = getProfileForApplicationId(suggestion.applicationId)
  if (!profile) return null

  const targetControl = profile.controls.find((control) => control.slot === slot)
  if (!targetControl) return null

  const applicationId = suggestion.applicationId

  // All-or-nothing: building the update may create a macro, then the
  // control is overwritten, a learned workflow it displaced may be
  // collected, and the suggestion is resolved. Any step failing throws
  // ROLLBACK, which better-sqlite3 turns into a rollback of the lot, so a
  // failure can never leave an orphan macro, or a changed control behind a
  // still-pending suggestion.
  const accept = getDatabase().transaction((): { suggestion: Suggestion; profile: ApplicationProfile } => {
    const update = buildControlUpdate(suggestion)
    if (!update) throw ROLLBACK
    const { label, action } = update
    if (!assignControlAction(profile.id, slot, label, action)) throw ROLLBACK
    collectReplacedMacro(targetControl.action, action)

    const resolved = resolveSuggestion(suggestionId, 'accepted')
    const updatedProfile = getProfileForApplicationId(applicationId)
    if (!resolved || !updatedProfile) throw ROLLBACK
    return { suggestion: resolved, profile: updatedProfile }
  })

  try {
    return accept()
  } catch (error) {
    if (error === ROLLBACK) return null
    throw error
  }
}

/** Thrown inside assignSuggestionToControl's transaction to roll it back
 *  on a fail-closed null; any other error still propagates. */
const ROLLBACK = Symbol('assignSuggestionToControl rollback')

function buildControlUpdate(
  suggestion: Suggestion
): { label: string; action: import('@shared/types').ControlAction } | null {
  const action = suggestion.action
  if (!action) {
    throw new Error('buildControlUpdate called with a suggestion that has no action')
  }

  switch (action.kind) {
    case 'assignShortcutToControl':
      return {
        label: toDisplayLabel(action.comboKeys.join('+')),
        action: { type: 'shortcut', keys: action.comboKeys }
      }

    case 'createMacroAndAssignToControl': {
      const macro = createMacro({
        name: action.sequence.join(' → '),
        applicationId: suggestion.applicationId ?? undefined,
        trigger: suggestion.isDemo ? DEMO_MACRO_TRIGGER : LEARNED_MACRO_TRIGGER,
        // A detected sequence is combo strings like 'Control+C'; convert
        // each into a proper shortcut step (Macro.actions is MacroStep[],
        // not the raw string[] a repeated-sequence pattern produces).
        actions: action.sequence.map((combo) => ({ type: 'shortcut' as const, keys: combo.split('+') })),
        delayMs: 0,
        enabled: true
      })
      return {
        label: toDisplayLabel(macro.name),
        action: { type: 'macro', macroId: macro.id }
      }
    }

    // WORKFLOW LEARNING: turns a detected chain (crossAppWorkflow or
    // multiStepWorkflow) into a real macro: see buildWorkflowMacroSteps.
    case 'createWorkflowMacroAndAssignToControl': {
      const actions = buildWorkflowMacroSteps(action.steps, action.stepDelaysMs)
      // Fail closed: a workflow with nothing that runs would leave a
      // control that does nothing when pressed.
      if (!hasRunnableSteps(actions)) return null

      // Real application names where known, not raw ids like 'githubdesktop'.
      const names = suggestion.chainApplicationNames ?? {}
      const stepName = (step: WorkflowStep): string =>
        step.type === 'appSwitch' && step.applicationId ? (names[step.applicationId] ?? step.applicationId) : describeStep(step)
      const name = action.steps.map(stepName).join(' → ')
      // A chain of only app switches is "go to <last app>": name the control
      // for where it takes you, since the full chain won't fit its label.
      const lastStep = action.steps[action.steps.length - 1]
      const onlySwitches = action.steps.every((step) => step.type === 'appSwitch')
      const label = onlySwitches ? stepName(lastStep) : name

      const macro = createMacro({
        name,
        applicationId: suggestion.applicationId ?? undefined,
        trigger: suggestion.isDemo ? DEMO_MACRO_TRIGGER : LEARNED_MACRO_TRIGGER,
        actions,
        delayMs: 0,
        enabled: true
      })
      return {
        label: toDisplayLabel(label),
        action: { type: 'macro', macroId: macro.id }
      }
    }
  }
}

export { buildWorkflowMacroSteps, hasRunnableSteps } from '../workflow/macroSteps'

