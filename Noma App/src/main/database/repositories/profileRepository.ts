import type { ApplicationProfile, Control, ControlAction } from '@shared/types'
import { getDatabase } from '../db'

interface ProfileRow {
  id: string
  application_id: string
  name: string
  icon: string | null
}

interface ControlRow {
  id: string
  slot: number
  label: string
  action_payload: string
}

/**
 * Returns the active profile configured for a given application id, or
 * null if none exists yet. A null profile is an honest, expected state
 * (brainstorm.md's "extensible" profile system means most applications
 * won't have one until the user — or a future onboarding flow — creates
 * it), not an error.
 */
export function getProfileForApplicationId(applicationId: string): ApplicationProfile | null {
  const db = getDatabase()

  const profileRow = db
    .prepare(
      `SELECT id, application_id, name, icon
       FROM profiles
       WHERE application_id = ? AND is_active = 1
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get(applicationId) as ProfileRow | undefined

  if (!profileRow) {
    return null
  }

  const controlRows = db
    .prepare(
      `SELECT id, slot, label, action_payload
       FROM controls
       WHERE profile_id = ?
       ORDER BY slot ASC`
    )
    .all(profileRow.id) as ControlRow[]

  const controls: Control[] = controlRows.map((row) => ({
    id: row.id,
    slot: row.slot,
    label: row.label,
    action: JSON.parse(row.action_payload) as ControlAction
  }))

  return {
    id: profileRow.id,
    applicationId: profileRow.application_id,
    name: profileRow.name,
    icon: profileRow.icon ?? undefined,
    controls,
    macroIds: [],
    moduleRecommendationIds: []
  }
}
