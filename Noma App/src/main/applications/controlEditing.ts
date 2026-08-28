import type { ApplicationProfile, ControlAction } from '@shared/types'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { getSeedDefaultControl } from '../database/seed'

/**
 * Backs the Control Mapping Editor. Deliberately scoped to applications
 * that already have a profile (seeded, or previously created by accepting
 * a suggestion) — same as `suggestionResolution.ts`, this never creates a
 * profile from nothing. Configuring a control on a brand-new, never-seen
 * application is a real gap (there's no path today to bootstrap a profile
 * for an arbitrary app), left as a clean next increment rather than
 * folded into this scope.
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

  const applied = assignControlAction(profile.id, slot, label, action)
  if (!applied) return null

  return getProfileForApplicationId(applicationId)
}

/** Restores a control to its original seed configuration. Returns null if
 *  this application was never seeded (nothing to reset to) or has no
 *  profile/matching slot. */
export function resetControlToDefault(applicationId: string, slot: number): ApplicationProfile | null {
  const defaultControl = getSeedDefaultControl(applicationId, slot)
  if (!defaultControl) return null
  return updateControl(applicationId, slot, defaultControl.label, defaultControl.action)
}
