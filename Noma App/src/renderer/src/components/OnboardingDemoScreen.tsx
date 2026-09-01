import { useEffect, useState } from 'react'
import type { Control } from '@shared/types'
import { KeyboardLayout } from './KeyboardLayout'
import { ControlTile } from './ControlTile'
import { OnboardingButton } from './OnboardingButton'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { GLASS_PANEL } from '../lib/surfaces'

/**
 * Self-contained demo data, not fetched from real application detection —
 * onboarding can't rely on the user actually having VS Code or Chrome
 * open/focused right now, and a live IPC-driven version would risk
 * `pressControl` actually executing real shortcuts against whatever
 * window really is focused (see actionExecutor.ts's "real execution").
 * `ControlTile` (not `VirtualControlButton`) is used deliberately — it's
 * the app's existing *read-only* control tile, so nothing here is
 * pressable. Slots/labels/shortcuts mirror the real seeded VS
 * Code/Chrome profiles (database/seed.ts) closely enough to be honest,
 * without being a live copy of them.
 */
const CODE_CONTEXT = {
  name: 'Visual Studio Code',
  controls: [
    { id: 'demo-run', slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
    { id: 'demo-debug', slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } },
    {
      id: 'demo-search',
      slot: 3,
      label: 'SEARCH',
      action: { type: 'shortcut', keys: ['Control', 'Shift', 'F'] }
    },
    {
      id: 'demo-terminal',
      slot: 4,
      label: 'TERMINAL',
      action: { type: 'shortcut', keys: ['Control', 'Backquote'] }
    }
  ] satisfies Control[]
}

const CHROME_CONTEXT = {
  name: 'Google Chrome',
  controls: [
    { id: 'demo-back', slot: 1, label: 'BACK', action: { type: 'shortcut', keys: ['Alt', 'ArrowLeft'] } },
    {
      id: 'demo-forward',
      slot: 2,
      label: 'FORWARD',
      action: { type: 'shortcut', keys: ['Alt', 'ArrowRight'] }
    },
    { id: 'demo-refresh', slot: 3, label: 'REFRESH', action: { type: 'shortcut', keys: ['Control', 'R'] } },
    { id: 'demo-newtab', slot: 4, label: 'NEW TAB', action: { type: 'shortcut', keys: ['Control', 'T'] } }
  ] satisfies Control[]
}

const SWITCH_AT_MS = 1800
const FADE_MS = 200
const TAGLINE_AT_MS = 3200

interface OnboardingDemoScreenProps {
  onContinue: () => void
}

/** Screen 5 — the "Noma Moment". Starts on VS Code's controls, auto-swaps
 *  to Chrome's after ~1.8s, then reveals "That's Noma." Reduced-motion
 *  users skip straight to the end state instead of watching a cut. */
export function OnboardingDemoScreen({ onContinue }: OnboardingDemoScreenProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [context, setContext] = useState(CODE_CONTEXT)
  const [isFaded, setIsFaded] = useState(false)
  const [showTagline, setShowTagline] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion) {
      setContext(CHROME_CONTEXT)
      setShowTagline(true)
      return
    }

    const swapTimeout = window.setTimeout(() => {
      setIsFaded(true)
      window.setTimeout(() => {
        setContext(CHROME_CONTEXT)
        setIsFaded(false)
      }, FADE_MS)
    }, SWITCH_AT_MS)
    const taglineTimeout = window.setTimeout(() => setShowTagline(true), TAGLINE_AT_MS)

    return () => {
      window.clearTimeout(swapTimeout)
      window.clearTimeout(taglineTimeout)
    }
  }, [prefersReducedMotion])

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-3xl font-semibold text-neutral-50">See Noma adapt.</h1>
      <p className="mt-3 text-sm text-neutral-500">Your controls change with your workflow.</p>

      <div className={`mt-8 w-full p-6 ${GLASS_PANEL}`}>
        <KeyboardLayout />
        <div className={`transition-opacity duration-200 ${isFaded ? 'opacity-0' : 'opacity-100'}`}>
          <div className="mb-3 text-left font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {context.name}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {context.controls.map((control) => (
              <ControlTile key={control.id} slot={control.slot} control={control} />
            ))}
          </div>
        </div>
      </div>

      <p
        className={`mt-8 font-display text-lg text-neutral-100 transition-opacity duration-500 ${
          showTagline ? 'opacity-100' : 'opacity-0'
        }`}
      >
        That&rsquo;s Noma.
      </p>

      <div className="mt-8">
        <OnboardingButton onClick={onContinue}>Continue</OnboardingButton>
      </div>
    </div>
  )
}
