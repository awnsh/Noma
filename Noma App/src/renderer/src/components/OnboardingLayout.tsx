import type { ReactNode } from 'react'
import { ONBOARDING_STEPS } from '../lib/onboardingSteps'
import { ONBOARDING_FOCUS_RING } from './OnboardingButton'

interface OnboardingLayoutProps {
  stepIndex: number
  /** Omitted on the first screen — there's nowhere to go back to. */
  onBack?: () => void
  /** The Noma Demo screen needs more room for the keyboard + controls. */
  wide?: boolean
  children: ReactNode
}

/**
 * The onboarding shell: no sidebar, no app navigation — just a back
 * button, a step progress indicator, and a centered content column. Every
 * screen renders inside this so the chrome (spacing, progress dots, back
 * affordance) never has to be rebuilt per-screen.
 */
export function OnboardingLayout({ stepIndex, onBack, wide = false, children }: OnboardingLayoutProps) {
  return (
    <div className="flex h-screen w-screen flex-col bg-base-950 text-neutral-200">
      <div className="flex shrink-0 items-center justify-between px-8 py-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          disabled={!onBack}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors duration-150 hover:text-neutral-200 disabled:pointer-events-none disabled:opacity-0 ${ONBOARDING_FOCUS_RING}`}
        >
          ←
        </button>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={stepIndex + 1}
        >
          {ONBOARDING_STEPS.map((step, index) => (
            <span
              key={step}
              className={`h-1.5 w-6 rounded-full transition-colors duration-200 ${
                index <= stepIndex ? 'bg-accent' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 pb-12">
        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>{children}</div>
      </div>
    </div>
  )
}
