import logo from '../assets/logo.png'
import { OnboardingButton } from './OnboardingButton'

interface OnboardingWelcomeScreenProps {
  onContinue: () => void
}

/** Screen 1 — deliberately sparse: a wordmark, one headline, one line of
 *  support copy, one button. No cards, no icons, no feature list. */
export function OnboardingWelcomeScreen({ onContinue }: OnboardingWelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <img
        src={logo}
        alt=""
        className="mb-6 h-14 w-14 rounded-2xl"
        style={{ mixBlendMode: 'screen' }}
      />
      <div className="mb-5 font-display text-xs font-medium uppercase tracking-[0.4em] text-neutral-500">
        Noma
      </div>
      <h1 className="font-display text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
        Your keyboard adapts to you.
      </h1>
      <p className="mt-6 max-w-sm text-base text-neutral-400">
        Noma changes your controls based on what you&rsquo;re doing, and learns the shortcuts you use
        most.
      </p>
      <div className="mt-10">
        <OnboardingButton onClick={onContinue}>Get Started</OnboardingButton>
      </div>
      <p className="mt-5 text-xs text-neutral-600">No account required.</p>
    </div>
  )
}
