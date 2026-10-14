import { useEffect, useState } from 'react'
import { GLIDE_ZONE_LABELS, type GlideZoneName } from '@shared/constants'
import type { Control } from '@shared/types'
import { useGlideStore } from '../stores/glideStore'
import { GlideGestureDemo } from './GlideGestureDemo'
import { GlideZoneMap } from './GlideZoneMap'
import { OnboardingButton } from './OnboardingButton'
import { glideActivityMessage } from '../lib/glideMessages'

/** Labels for the practice map: just the zone names, nothing runs here. */
const PRACTICE_CONTROLS: Control[] = [1, 2, 3, 4].map((slot) => ({
  id: `practice-${slot}`,
  slot,
  label: 'Try me',
  action: { type: 'systemCommand', command: 'practice' }
}))

interface OnboardingGlideScreenProps {
  onContinue: () => void
}

/**
 * Screen 2: see the gesture, turn Glide on, and do it once for real. Noma is
 * in front the whole time, so a swipe only lights up its zone (practice,
 * see main/holo/glidePress.ts); nothing runs in another app. A computer
 * without a precision touchpad is told so plainly and moves on.
 */
export function OnboardingGlideScreen({ onContinue }: OnboardingGlideScreenProps) {
  const { state, lastActivity, isChanging, refresh, setEnabled } = useGlideStore()
  const [startedAt] = useState(Date.now())
  const [recognised, setRecognised] = useState(0)
  const [flashing, setFlashing] = useState<GlideZoneName | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!lastActivity || lastActivity.at < startedAt || lastActivity.type !== 'fire') return
    setRecognised((count) => count + 1)
    setFlashing(lastActivity.zone)
    const timeout = window.setTimeout(() => setFlashing(null), 700)
    return () => window.clearTimeout(timeout)
  }, [lastActivity, startedAt])

  const zoneCount = state?.zoneCount ?? 4
  const unsupported = state !== null && (!state.platformSupported || (!state.enabled && state.error !== null))
  const recent = lastActivity && lastActivity.at >= startedAt ? lastActivity : null

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-3xl font-semibold text-neutral-50">Meet Glide</h1>
      <p className="mt-3 max-w-md text-sm text-neutral-400">
        Rest a fingertip on the palm rest beside your trackpad, then flick it onto the trackpad. The side and half you
        land in picks the action. It never clicks, and normal trackpad use doesn&apos;t count.
      </p>

      <div className="mt-8 w-full">
        {state?.enabled ? (
          <>
            <GlideZoneMap compact zoneCount={zoneCount} controls={PRACTICE_CONTROLS} flashingZone={flashing} centerLabel="Swipe in" />
            <p className="mt-4 min-h-[2.5rem] text-sm text-holo-text" aria-live="polite">
              {recognised > 0 && recent?.type === 'fire'
                ? `That's it: ${GLIDE_ZONE_LABELS[zoneCount][recent.zone].toLowerCase()} zone. Practice only, nothing ran.`
                : recent
                  ? glideActivityMessage(recent, zoneCount)
                  : 'Try it now. Start off the trackpad, on the palm rest.'}
            </p>
          </>
        ) : (
          <GlideGestureDemo className="mx-auto w-full max-w-md" />
        )}
      </div>

      {unsupported && (
        <p className="mt-6 max-w-md rounded-lg border border-error/30 bg-error-muted px-4 py-3 text-left text-sm text-neutral-100">
          {state?.error ??
            'Glide needs a Windows precision touchpad or a Mac trackpad, so it isn’t available on this computer. Flow and the rest of Noma still work.'}
        </p>
      )}

      <div className="mt-8 flex items-center gap-6">
        {state?.enabled ? (
          <>
            {recognised === 0 && (
              <OnboardingButton variant="secondary" onClick={onContinue}>
                Skip for now
              </OnboardingButton>
            )}
            <OnboardingButton onClick={onContinue} disabled={recognised === 0}>
              {recognised > 0 ? 'Continue' : 'Waiting for a swipe…'}
            </OnboardingButton>
          </>
        ) : unsupported ? (
          <OnboardingButton onClick={onContinue}>Continue without Glide</OnboardingButton>
        ) : (
          <>
            <OnboardingButton variant="secondary" onClick={onContinue}>
              Not now
            </OnboardingButton>
            <OnboardingButton onClick={() => void setEnabled(true)} disabled={isChanging || state === null}>
              {isChanging ? 'Starting…' : 'Turn on Glide'}
            </OnboardingButton>
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-neutral-500">You can switch Glide off any time from the tray icon or the Glide page.</p>
    </div>
  )
}
