import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'
import wordmark from '../assets/noma-wordmark.png'
import { OnboardingButton } from './OnboardingButton'
import { GlideZoneMap } from './GlideZoneMap'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { BetaBadge } from './BetaBadge'
import { IS_BETA } from '@shared/constants'

interface OnboardingWelcomeScreenProps {
  onContinue: () => void
}

/** A few apps the trackpad steps through, each in its own colour: every
 *  app has its own four zones. An illustration, zone names only. */
const SHOWCASE_APPS = [
  { id: 'chrome', name: 'Chrome' },
  { id: 'spotify', name: 'Spotify' },
  { id: 'discord', name: 'Discord' },
  { id: 'excel', name: 'Excel' }
]
const SHOWCASE_STEP_MS = 2600

/** Screen 1: what Noma is, in two sentences, and one button. */
export function OnboardingWelcomeScreen({ onContinue }: OnboardingWelcomeScreenProps) {
  const reduceMotion = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % SHOWCASE_APPS.length), SHOWCASE_STEP_MS)
    return () => window.clearInterval(timer)
  }, [reduceMotion])
  const app = SHOWCASE_APPS[index]

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-10 flex items-center gap-1.5">
        <img src={logo} alt="" className="h-[22px] w-[34px] object-contain" />
        <img src={wordmark} alt="Noma" className="h-[13px] w-auto" />
        <BetaBadge className="ml-1" />
      </div>
      <div className="mb-10 w-[360px]" aria-hidden>
        <GlideZoneMap compact zoneCount={4} controls={[]} centerLabel={app.name} centerAppId={app.id} />
      </div>
      <h1 className="font-display text-[28px] font-semibold leading-tight text-neutral-50">
        Welcome to Noma
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-neutral-300">
        Noma gives every app four actions you run by sliding a finger onto your trackpad. As you work, it notices the
        shortcut sequences you repeat and offers to turn them into one of those actions.
      </p>
      <div className="mt-8">
        <OnboardingButton onClick={onContinue}>Get started</OnboardingButton>
      </div>
      <p className="mt-5 text-xs text-neutral-500">About a minute. No account, no extra hardware.</p>
      {IS_BETA && (
        <p className="mt-2 text-xs text-neutral-500">This is a beta, so some things may change before the final release.</p>
      )}
    </div>
  )
}
