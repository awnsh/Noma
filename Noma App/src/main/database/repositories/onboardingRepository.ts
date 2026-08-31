import type { OnboardingState } from '@shared/types'
import { getDatabase } from '../db'

const ONBOARDING_STATE_KEY = 'onboardingState'

/** The state a fresh install starts in — also what deleteAllData()'s
 *  factory reset returns to, since `settings` (where this lives) is wiped
 *  along with everything else there. */
const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  step: 'welcome',
  selectedUseCases: [],
  flowEnabled: false,
  hardwareSkipped: false
}

/**
 * First-launch onboarding's persisted progress — one JSON blob under the
 * generic `settings` key/value table (the same table
 * workflowMonitoringEnabled uses), not a dedicated table: this is a single
 * small user-preference record, not relational data.
 */
export function getOnboardingState(): OnboardingState {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(ONBOARDING_STATE_KEY) as
    | { value: string }
    | undefined
  if (!row) return DEFAULT_ONBOARDING_STATE

  try {
    return { ...DEFAULT_ONBOARDING_STATE, ...(JSON.parse(row.value) as Partial<OnboardingState>) }
  } catch {
    // A corrupted/unparseable row should never crash onboarding — treat it
    // like a fresh install rather than throwing.
    return DEFAULT_ONBOARDING_STATE
  }
}

/**
 * Merges `update` into the persisted state and saves the result. Every
 * onboarding screen calls this as the user moves forward (or back) rather
 * than writing once at the very end, so quitting Noma mid-onboarding
 * resumes from the last screen reached instead of restarting from Welcome.
 */
export function saveOnboardingState(update: Partial<OnboardingState>): OnboardingState {
  const db = getDatabase()
  const next: OnboardingState = { ...getOnboardingState(), ...update }
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run({ key: ONBOARDING_STATE_KEY, value: JSON.stringify(next) })
  return next
}
