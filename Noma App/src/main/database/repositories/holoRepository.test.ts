import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../db'
import { clearHoloCalibration, getHoloCalibration, saveHoloCalibration } from './holoRepository'
import type { HoloCalibration } from '@shared/types'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

const FULL_CALIBRATION: HoloCalibration = {
  zones: [
    { zone: 'frontLeft', features: [1, 0, 0], sampleCount: 6 },
    { zone: 'frontRight', features: [0, 1, 0], sampleCount: 6 },
    { zone: 'rearLeft', features: [0, 0, 1], sampleCount: 6 },
    { zone: 'rearRight', features: [1, 1, 1], sampleCount: 6 }
  ],
  calibratedAt: 12345
}

describe('getHoloCalibration', () => {
  it('returns null when nothing has been calibrated yet', () => {
    expect(getHoloCalibration()).toBeNull()
  })

  it('returns null (not a crash) for a corrupted row', () => {
    getDatabase()
      .prepare("INSERT INTO settings (key, value) VALUES ('holoCalibration', 'not json')")
      .run()
    expect(getHoloCalibration()).toBeNull()
  })
})

describe('saveHoloCalibration', () => {
  it('round-trips a full 4-zone calibration unmodified — no paywall/tier gate', () => {
    const saved = saveHoloCalibration(FULL_CALIBRATION)

    expect(saved.zones.map((z) => z.zone)).toEqual(['frontLeft', 'frontRight', 'rearLeft', 'rearRight'])
    expect(getHoloCalibration()).toEqual(saved)
  })

  it('persists a partial (e.g. interrupted) calibration exactly as given, not padded or capped', () => {
    const partial: HoloCalibration = { ...FULL_CALIBRATION, zones: FULL_CALIBRATION.zones.slice(0, 2) }
    const saved = saveHoloCalibration(partial)
    expect(saved).toEqual(partial)
  })
})

describe('clearHoloCalibration', () => {
  it('erases a saved calibration back to null', () => {
    saveHoloCalibration(FULL_CALIBRATION)
    clearHoloCalibration()
    expect(getHoloCalibration()).toBeNull()
  })

  it('is a no-op when nothing was ever saved', () => {
    expect(() => clearHoloCalibration()).not.toThrow()
    expect(getHoloCalibration()).toBeNull()
  })
})
