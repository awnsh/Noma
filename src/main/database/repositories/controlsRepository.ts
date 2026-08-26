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
