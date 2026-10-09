import { getDatabase } from '../database/db'
import {
  deleteLearnedMacroIfOrphaned,
  deleteMacro,
  getMacroById,
  isLearnedMacroTrigger,
  stripMacroReferences
} from '../database/repositories/macrosRepository'
import { assignControlAction, getControlsReferencingMacro } from '../database/repositories/controlsRepository'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { getSeedDefaultControl } from '../database/seed'

/**
 * Removes a saved workflow: every control it sits on goes back to what it
 * was before (the starter control for a seeded app, otherwise an empty
 * slot), every `{type: 'macro'}` step in another macro that calls it is
 * stripped out, then the workflow itself is deleted. One transaction, so
 * neither a control nor another macro can ever be left pointing at a
 * workflow that no longer exists.
 *
 * Only for workflows Noma saved from a Flow or Demo suggestion (trigger
 * LEARNED_MACRO_TRIGGER / DEMO_MACRO_TRIGGER). A user-authored macro is
 * refused (null, nothing changed): that's the Macro Studio's delete, which
 * warns first (getMacroReferences) instead of silently rewriting controls.
 * The only callers today are the demo reset and the REMOVE_WORKFLOW IPC
 * channel, which nothing in the renderer currently invokes for a manual
 * macro.
 *
 * Returns the applications whose controls changed (so the caller can push a
 * live update), or null when there is no such learned workflow.
 */
export function removeLearnedWorkflow(macroId: string): { applicationIds: string[] } | null {
  const macro = getMacroById(macroId)
  if (!macro || !isLearnedMacroTrigger(macro.trigger)) return null

  const remove = getDatabase().transaction((): string[] => {
    const referencing = getControlsReferencingMacro(macroId)
    for (const control of referencing) {
      const profile = getProfileForApplicationId(control.applicationId)
      if (!profile) continue
      const seed = getSeedDefaultControl(control.applicationId, control.slot)
      if (seed) assignControlAction(profile.id, control.slot, seed.label, seed.action)
      else assignControlAction(profile.id, control.slot, `SLOT ${control.slot}`, { type: 'shortcut', keys: [] })
    }
    stripMacroReferences(macroId)
    deleteMacro(macroId)
    // Learned macros this one called may have had no other user.
    for (const step of macro.actions) {
      if (step.type === 'macro') deleteLearnedMacroIfOrphaned(step.macroId)
    }
    return [...new Set(referencing.map((control) => control.applicationId))]
  })

  return { applicationIds: remove() }
}
