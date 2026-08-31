import type { OnboardingStepId } from '@shared/types'

/** The fixed screen order — see Onboarding.tsx. */
export const ONBOARDING_STEPS: OnboardingStepId[] = [
  'welcome',
  'useCases',
  'flowPrivacy',
  'hardware',
  'demo',
  'completion'
]

/** Resolves a persisted step id to its index, defaulting to Welcome for an
 *  unrecognized or missing value rather than throwing. */
export function stepIndexOf(step: OnboardingStepId | undefined): number {
  const index = step ? ONBOARDING_STEPS.indexOf(step) : -1
  return index === -1 ? 0 : index
}
