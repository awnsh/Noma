import type { ControlAction } from '@shared/types'
import { getDatabase } from '../db'

/** Truncates a generated label to what a small physical display can render
 *  (see docs/architecture.md's "Hardware embedding considerations"). */
const MAX_LABEL_LENGTH = 12

export function toDisplayLabel(text: string): string {
  return text.length > MAX_LABEL_LENGTH ? `${text.slice(0, MAX_LABEL_LENGTH - 1)}…` : text
}

/**
 * Overwrites the control at `profileId`/`slot` with a new label and
 * action — the one place a suggestion's accepted action actually lands on
 * a physical (or virtual) button. Only ever called with a slot the user
 * explicitly picked; see suggestionResolution.ts.
 */
export function assignControlAction(
  profileId: string,
  slot: number,
  label: string,
  action: ControlAction
): boolean {
  const db = getDatabase()
  const result = db
    .prepare(
      `UPDATE controls
       SET label = @label, action_type = @actionType, action_payload = @actionPayload
       WHERE profile_id = @profileId AND slot = @slot`
    )
    .run({
      profileId,
      slot,
      label: toDisplayLabel(label),
      actionType: action.type,
      actionPayload: JSON.stringify(action)
    })
  return result.changes > 0
}

interface ReferencingControlRow {
  application_id: string
  application_name: string
  slot: number
  label: string
  action_payload: string
}

/** Every control (across every application) currently assigned a
 *  `{type: 'macro', macroId}` action pointing at this macro — used by the
 *  Macro Studio to warn before deleting a macro that's still in use.
 *  Deliberately a plain string search over action_type = 'macro' rows
 *  rather than a dedicated foreign-key column, since action_payload is
 *  already the single source of truth for a control's action. */
export function getControlsReferencingMacro(
  macroId: string
): Array<{ applicationId: string; applicationName: string; slot: number; label: string }> {
  const rows = getDatabase()
    .prepare(
      `SELECT a.id AS application_id, a.name AS application_name, c.slot AS slot, c.label AS label,
              c.action_payload AS action_payload
       FROM controls c
       JOIN profiles p ON p.id = c.profile_id
       JOIN applications a ON a.id = p.application_id
       WHERE c.action_type = 'macro'`
    )
    .all() as ReferencingControlRow[]

  return rows
    .filter((row) => {
      const action = JSON.parse(row.action_payload) as { type: string; macroId?: string }
      return action.type === 'macro' && action.macroId === macroId
    })
    .map((row) => ({
      applicationId: row.application_id,
      applicationName: row.application_name,
      slot: row.slot,
      label: row.label
    }))
}
