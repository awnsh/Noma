import { emptyModel, type QualityModel } from '../../ai/workflowQuality'
import { getDatabase } from '../db'

const QUALITY_MODEL_KEY = 'workflowQualityModel'

/** The learned workflow-quality model (see ai/workflowQuality.ts), stored as
 *  one JSON blob in `settings`. Falls back to an untrained model if absent or
 *  unreadable — never throws, so a corrupt value can't break suggestions. */
export function loadQualityModel(): QualityModel {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(QUALITY_MODEL_KEY) as
    | { value: string }
    | undefined
  if (!row) return emptyModel()
  try {
    const parsed = JSON.parse(row.value) as Partial<QualityModel>
    return {
      weights: parsed.weights && typeof parsed.weights === 'object' ? parsed.weights : {},
      examples: typeof parsed.examples === 'number' ? parsed.examples : 0
    }
  } catch {
    return emptyModel()
  }
}

export function saveQualityModel(model: QualityModel): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run({ key: QUALITY_MODEL_KEY, value: JSON.stringify(model) })
}
