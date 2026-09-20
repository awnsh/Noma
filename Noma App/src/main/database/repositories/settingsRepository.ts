import type { InputSource } from '@shared/types'
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

const INPUT_SOURCE_KEY = 'inputSource'

/** 'keyboard' (physical/virtual) by default — Holo is opt-in, same
 *  off-by-default posture as workflow monitoring. */
export function getInputSource(): InputSource {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(INPUT_SOURCE_KEY) as
    | { value: string }
    | undefined
  return row?.value === 'holo' ? 'holo' : 'keyboard'
}

export function setInputSource(source: InputSource): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run({ key: INPUT_SOURCE_KEY, value: source })
}

const CLICK_CAPTURE_KEY = 'clickCaptureEnabled'

/** Off by default and separate from workflowMonitoringEnabled: watching
 *  which on-screen buttons you click is a distinct kind of capture from key
 *  combos and app switches, so it needs its own explicit opt-in. Only ever
 *  acts while workflow monitoring is also on. */
export function getClickCaptureEnabled(): boolean {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(CLICK_CAPTURE_KEY) as
    | { value: string }
    | undefined
  return row?.value === '1'
}

export function setClickCaptureEnabled(enabled: boolean): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run({ key: CLICK_CAPTURE_KEY, value: enabled ? '1' : '0' })
}
