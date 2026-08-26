import type { ApplicationProfile, Suggestion } from '@shared/types'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { assignControlAction, toDisplayLabel } from '../database/repositories/controlsRepository'
import { createMacro } from '../database/repositories/macrosRepository'
import { getSuggestionById, resolveSuggestion } from '../database/repositories/suggestionsRepository'

/**
 * Accepts a suggestion by writing its action onto a control slot the user
 * explicitly picked — the only place a suggestion actually changes a
 * profile. Deliberately conservative: never called automatically, never
 * picks a slot itself, and fails closed (returns null) rather than
 * guessing when the suggestion, its application's profile, or the
 * requested slot doesn't check out.
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

  const { label, action } = buildControlUpdate(suggestion)
  const applied = assignControlAction(profile.id, slot, label, action)
  if (!applied) return null

  const resolved = resolveSuggestion(suggestionId, 'accepted')
  const updatedProfile = getProfileForApplicationId(suggestion.applicationId)
  if (!resolved || !updatedProfile) return null

  return { suggestion: resolved, profile: updatedProfile }
}

function buildControlUpdate(
  suggestion: Suggestion
): { label: string; action: import('@shared/types').ControlAction } {
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
        trigger: 'flow-control',
        actions: action.sequence,
        delayMs: 0,
        enabled: true
      })
      return {
        label: toDisplayLabel(macro.name),
        action: { type: 'macro', macroId: macro.id }
      }
    }
  }
}
