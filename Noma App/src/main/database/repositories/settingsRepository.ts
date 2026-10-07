import type { InputSource } from '@shared/types'
import { getDatabase } from '../db'

/** The raw string stored under `key` in the generic `settings` table. */
export function getSetting(key: string): string | undefined {
  const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (@key, @value)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run({ key, value })
}

/** A JSON blob stored under `key`. `parse` shapes the decoded value; a
 *  missing row, unparseable JSON, or a throwing `parse` yields `fallback`. */
export function getJsonSetting<T>(key: string, parse: (raw: unknown) => T, fallback: T): T {
  const stored = getSetting(key)
  if (stored === undefined) return fallback
  try {
    return parse(JSON.parse(stored))
  } catch {
    return fallback
  }
}

export function setJsonSetting(key: string, value: unknown): void {
  setSetting(key, JSON.stringify(value))
}

const WORKFLOW_MONITORING_KEY = 'workflowMonitoringEnabled'

/** Off by default: see docs/privacy-and-legal.md. Every workflow-monitoring
 *  feature must be explicitly opted into. */
export function getWorkflowMonitoringEnabled(): boolean {
  return getSetting(WORKFLOW_MONITORING_KEY) === '1'
}

export function setWorkflowMonitoringEnabled(enabled: boolean): void {
  setSetting(WORKFLOW_MONITORING_KEY, enabled ? '1' : '0')
}

const INPUT_SOURCE_KEY = 'inputSource'

/** 'keyboard' (physical/virtual) by default. Holo is opt-in, same
 *  off-by-default posture as workflow monitoring. */
export function getInputSource(): InputSource {
  return getSetting(INPUT_SOURCE_KEY) === 'holo' ? 'holo' : 'keyboard'
}

export function setInputSource(source: InputSource): void {
  setSetting(INPUT_SOURCE_KEY, source)
}

const CLICK_CAPTURE_KEY = 'clickCaptureEnabled'

/** Off by default and separate from workflowMonitoringEnabled: watching
 *  which on-screen buttons you click is a distinct kind of capture from key
 *  combos and app switches, so it needs its own explicit opt-in. Only ever
 *  acts while workflow monitoring is also on. */
export function getClickCaptureEnabled(): boolean {
  return getSetting(CLICK_CAPTURE_KEY) === '1'
}

export function setClickCaptureEnabled(enabled: boolean): void {
  setSetting(CLICK_CAPTURE_KEY, enabled ? '1' : '0')
}

const GLIDE_ENABLED_KEY = 'glideEnabled'
const GLIDE_ZONE_COUNT_KEY = 'glideZoneCount'

/** Glide on/off. Off on a fresh install. Before this setting existed, Glide
 *  ran in the background only when Input Source was set to Glide, so that
 *  is what an older install without the row reads as. */
export function getGlideEnabled(): boolean {
  const stored = getSetting(GLIDE_ENABLED_KEY)
  if (stored !== undefined) return stored === '1'
  return getInputSource() === 'holo'
}

export function setGlideEnabled(enabled: boolean): void {
  setSetting(GLIDE_ENABLED_KEY, enabled ? '1' : '0')
}

/** Four zones (upper and lower half of each side) unless set to two. */
export function getGlideZoneCount(): 2 | 4 {
  return getSetting(GLIDE_ZONE_COUNT_KEY) === '2' ? 2 : 4
}

export function setGlideZoneCount(zoneCount: 2 | 4): void {
  setSetting(GLIDE_ZONE_COUNT_KEY, zoneCount === 2 ? '2' : '4')
}
