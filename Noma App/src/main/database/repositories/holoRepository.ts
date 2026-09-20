import { HOLO_CALIBRATION_VERSION, type HoloCalibration } from '@shared/types'
import { getDatabase } from '../db'

const HOLO_CALIBRATION_KEY = 'holoCalibration'

/**
 * Holo's calibration profile — one JSON blob under the generic `settings`
 * key/value table (the same table onboardingState/workflowMonitoringEnabled
 * already use), not a dedicated table: this is one small per-install
 * record, not relational data. Unlike onboarding, there's no meaningful
 * "default" calibration — null means "never calibrated," a real, distinct
 * state the Holo page has to show differently from "calibrated but empty."
 */
export function getHoloCalibration(): HoloCalibration | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(HOLO_CALIBRATION_KEY) as
    | { value: string }
    | undefined
  if (!row) return null

  try {
    const parsed = JSON.parse(row.value) as HoloCalibration
    // Saved by an older pipeline whose feature vectors mean something
    // different — unusable, so it reads as "not calibrated" and the user
    // recalibrates rather than getting silent misclassification.
    return parsed.version === HOLO_CALIBRATION_VERSION ? parsed : null
  } catch {
    // A corrupted/unparseable row should read as "not calibrated" rather
    // than crash the Holo page — the user just recalibrates.
    return null
  }
}

/**
 * Saves a calibration as-is. No paywall/tier gate exists on Holo — all 4
 * zones are available to everyone by explicit request; a real paywall
 * previously capped the zone list here (see git history if that's ever
 * wanted back) and this is the right place to reintroduce that
 * enforcement, not the renderer's UI, if it ever comes back for real.
 */
export function saveHoloCalibration(calibration: HoloCalibration): HoloCalibration {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run({ key: HOLO_CALIBRATION_KEY, value: JSON.stringify(calibration) })

  return calibration
}

/** Erases calibration entirely — "recalibrate from scratch." */
export function clearHoloCalibration(): void {
  const db = getDatabase()
  db.prepare('DELETE FROM settings WHERE key = ?').run(HOLO_CALIBRATION_KEY)
}
