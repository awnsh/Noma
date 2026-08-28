import { getDatabase } from '../db'

const WORKFLOW_MONITORING_KEY = 'workflowMonitoringEnabled'

/** Off by default — see docs/privacy-and-legal.md. Every workflow-monitoring
 *  feature must be explicitly opted into. */
export function getWorkflowMonitoringEnabled(): boolean {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(WORKFLOW_MONITORING_KEY) as
    | { value: string }
    | undefined
  return row?.value === '1'
}

export function setWorkflowMonitoringEnabled(enabled: boolean): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run({ key: WORKFLOW_MONITORING_KEY, value: enabled ? '1' : '0' })
}
