import type { ApplicationProfile, ControlAction } from '@shared/types'
import { getDatabase } from '../database/db'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { deleteLearnedMacroIfOrphaned } from '../database/repositories/macrosRepository'

/**
 * After a control's action has been overwritten: if it used to hold a
 * learned/demo workflow (`{type: 'macro'}`) that nothing references any
 * more, delete that workflow rather than leave it orphaned forever. A
 * user-authored macro is never deleted here (deleteLearnedMacroIfOrphaned
 * checks the trigger), and re-assigning the same macro is a no-op. Call it
 * inside the same transaction as the overwrite.
 */
export function collectReplacedMacro(previous: ControlAction | undefined, next: ControlAction): void {
  if (previous?.type !== 'macro') return
  if (next.type === 'macro' && next.macroId === previous.macroId) return
  deleteLearnedMacroIfOrphaned(previous.macroId)
}

/**
 * Backs the Control Mapping Editor. Deliberately scoped to applications
 * that already have a profile (seeded, or previously created by accepting
 * a suggestion); same as `suggestionResolution.ts`, this never creates a
 * profile from nothing. Configuring a control on a brand-new, never-seen
 * application is a real gap (there's no path today to bootstrap a profile
 * for an arbitrary app), left as a clean next increment rather than
 * folded into this scope. The overwrite and the cleanup of a learned
 * workflow it displaced (collectReplacedMacro) are one transaction.
 */
export function updateControl(
  applicationId: string,
  slot: number,
  label: string,
  action: ControlAction
): ApplicationProfile | null {
  const profile = getProfileForApplicationId(applicationId)
  if (!profile) return null

  const targetControl = profile.controls.find((control) => control.slot === slot)
  if (!targetControl) return null

  const apply = getDatabase().transaction((): boolean => {
    if (!assignControlAction(profile.id, slot, label, action)) return false
    collectReplacedMacro(targetControl.action, action)
    return true
  })
  if (!apply()) return null

  return getProfileForApplicationId(applicationId)
}

/** Empties one zone: no label, nothing assigned. Only that control changes;
 *  the rest of the profile is untouched (a learned workflow it held is
 *  deleted if nothing else uses it). Returns null if the application has
 *  no profile or no such slot. */
export function clearControl(applicationId: string, slot: number): ApplicationProfile | null {
  return updateControl(applicationId, slot, '', { type: 'none' })
}
