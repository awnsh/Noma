import { emptyModel, type QualityModel } from '../../ai/workflowQuality'
import { getJsonSetting, setJsonSetting } from './settingsRepository'

const QUALITY_MODEL_KEY = 'workflowQualityModel'

/** The learned workflow-quality model (see ai/workflowQuality.ts), stored as
 *  one JSON blob in `settings`. Falls back to an untrained model if absent or
 *  unreadable; never throws, so a corrupt value can't break suggestions. */
export function loadQualityModel(): QualityModel {
  return getJsonSetting<QualityModel>(
    QUALITY_MODEL_KEY,
    (raw) => {
      const parsed = raw as Partial<QualityModel>
      return {
        weights: parsed.weights && typeof parsed.weights === 'object' ? parsed.weights : {},
        examples: typeof parsed.examples === 'number' ? parsed.examples : 0
      }
    },
    emptyModel()
  )
}

export function saveQualityModel(model: QualityModel): void {
  setJsonSetting(QUALITY_MODEL_KEY, model)
}
