import type { WorkflowEvent, WorkflowEventType } from '@shared/types'
import { getDatabase } from '../db'

interface WorkflowEventRow {
  id: number
  application_id: string | null
  event_type: WorkflowEventType
  combo_keys: string | null
  control_id: string | null
  timestamp: number
}

export function insertWorkflowEvent(event: {
  applicationId: string | null
  eventType: WorkflowEventType
  comboKeys?: string[]
  controlId?: string
  timestamp: number
}): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO workflow_events (application_id, event_type, combo_keys, control_id, timestamp)
     VALUES (@applicationId, @eventType, @comboKeys, @controlId, @timestamp)`
  ).run({
    applicationId: event.applicationId,
    eventType: event.eventType,
    comboKeys: event.comboKeys ? JSON.stringify(event.comboKeys) : null,
    controlId: event.controlId ?? null,
    timestamp: event.timestamp
  })
}

export function getWorkflowEventsSince(sinceTimestamp: number): WorkflowEvent[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT id, application_id, event_type, combo_keys, control_id, timestamp
       FROM workflow_events
       WHERE timestamp >= ?
       ORDER BY timestamp ASC`
    )
    .all(sinceTimestamp) as WorkflowEventRow[]

  return rows.map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    eventType: row.event_type,
    comboKeys: row.combo_keys ? (JSON.parse(row.combo_keys) as string[]) : undefined,
    controlId: row.control_id ?? undefined,
    timestamp: row.timestamp
  }))
}
