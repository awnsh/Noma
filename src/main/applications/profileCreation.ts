import { randomUUID } from 'crypto'
import type { Application, ApplicationProfile, ApplicationProfileSummary } from '@shared/types'
import { getDatabase } from '../database/db'
import { getAllApplications, upsertApplication } from '../database/repositories/applicationsRepository'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'

/** New profiles start with 4 unconfigured slots — the same 12-char
 *  display-label constraint as every other label in the app. The user
 *  fills these in with the Control Mapping Editor (Phase 1); an empty
 *  `keys` array is already a safe no-op (actionExecutor.ts refuses to send
 *  an empty combo with a clear reason) rather than a placeholder shortcut
 *  that might do something unintended. */
const DEFAULT_SLOT_LABELS = ['SLOT 1', 'SLOT 2', 'SLOT 3', 'SLOT 4']

/**
 * Bootstraps a brand-new profile for an application that doesn't have one
 * yet — closes the gap flagged since Phase 1 (Control Mapping Editor could
 * edit an existing profile's controls but had no way to create the profile
 * itself; brainstorm.md's "extensible profile system" was only extensible
 * via seed data or accepting a suggestion until now).
 *
 * Returns null if this application already has an active profile — this
 * never silently creates a second, competing one; use updateControl to
 * change an existing profile instead.
 */
export function createProfileForApplication(
  application: Application,
  profileName: string
): ApplicationProfile | null {
  if (getProfileForApplicationId(application.id)) return null

  upsertApplication(application)

  const db = getDatabase()
  const profileId = randomUUID()
  const insertProfile = db.prepare(
    'INSERT INTO profiles (id, application_id, name) VALUES (@id, @applicationId, @name)'
  )
  const insertControl = db.prepare(
    `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
     VALUES (@id, @profileId, @slot, @label, @actionType, @actionPayload)`
  )

  const createAll = db.transaction(() => {
    insertProfile.run({ id: profileId, applicationId: application.id, name: profileName })
    DEFAULT_SLOT_LABELS.forEach((label, index) => {
      insertControl.run({
        id: randomUUID(),
        profileId,
        slot: index + 1,
        label,
        actionType: 'shortcut',
        actionPayload: JSON.stringify({ type: 'shortcut', keys: [] })
      })
    })
  })
  createAll()

  return getProfileForApplicationId(application.id)
}

/** Renames a profile in place. Returns null if this application has no profile. */
export function renameApplicationProfile(
  applicationId: string,
  name: string
): ApplicationProfile | null {
  const profile = getProfileForApplicationId(applicationId)
  if (!profile) return null
  getDatabase().prepare('UPDATE profiles SET name = ? WHERE id = ?').run(name, profile.id)
  return getProfileForApplicationId(applicationId)
}

/** Deletes a profile and every control under it (controls.profile_id
 *  cascades). Returns whether a profile actually existed to delete. */
export function deleteApplicationProfile(applicationId: string): boolean {
  const profile = getProfileForApplicationId(applicationId)
  if (!profile) return false
  getDatabase().prepare('DELETE FROM profiles WHERE id = ?').run(profile.id)
  return true
}

/** Every known application and whether it has a profile yet — the
 *  Profiles page's list. Small, N+1-query approach is fine here: this
 *  reads the applications table, which only ever holds a handful of rows
 *  in a single-user desktop app. */
export function listApplicationProfileSummaries(): ApplicationProfileSummary[] {
  return getAllApplications().map((application) => {
    const profile = getProfileForApplicationId(application.id)
    return { application, hasProfile: profile !== null, profileName: profile?.name }
  })
}
