import type { OnboardingState } from '@shared/types'
import { getJsonSetting, setJsonSetting } from './settingsRepository'

const ONBOARDING_STATE_KEY = 'onboardingState'

/** The state a fresh install starts in; also what deleteAllData()'s
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
 * First-launch onboarding's persisted progress; one JSON blob under the
 * generic `settings` key/value table (the same table
 * workflowMonitoringEnabled uses), not a dedicated table: this is a single
 * small user-preference record, not relational data.
 */
export function getOnboardingState(): OnboardingState {
  // A corrupted/unparseable row should never crash onboarding; it reads
  // like a fresh install rather than throwing.
  return getJsonSetting(
    ONBOARDING_STATE_KEY,
    (raw) => ({ ...DEFAULT_ONBOARDING_STATE, ...(raw as Partial<OnboardingState>) }),
    DEFAULT_ONBOARDING_STATE
  )
}

/**
 * Merges `update` into the persisted state and saves the result. Every
 * onboarding screen calls this as the user moves forward (or back) rather
 * than writing once at the very end, so quitting Noma mid-onboarding
 * resumes from the last screen reached instead of restarting from Welcome.
 */
export function saveOnboardingState(update: Partial<OnboardingState>): OnboardingState {
  const next: OnboardingState = { ...getOnboardingState(), ...update }
  setJsonSetting(ONBOARDING_STATE_KEY, next)
  return next
}
