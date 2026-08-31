import { useEffect } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { OnboardingButton } from './OnboardingButton'

interface OnboardingCompletionScreenProps {
  onStart: () => void
}

/** Screen 6 — the checklist reflects live, freshly-refreshed state (not
 *  whatever was clicked a few screens ago), so it can never show a stale
 *  "Flow enabled" if the user somehow disabled it again before finishing,
 *  or the wrong hardware line if a device was plugged in during the demo. */
export function OnboardingCompletionScreen({ onStart }: OnboardingCompletionScreenProps) {
  const { enabled: flowEnabled, refresh: refreshWorkflow } = useWorkflowStore()
  const { status: hardwareStatus, refresh: refreshHardware } = useHardwareStore()

  useEffect(() => {
    refreshWorkflow()
    refreshHardware()
  }, [refreshWorkflow, refreshHardware])

  const isPhysical = hardwareStatus.connected && hardwareStatus.deviceType !== 'virtual'

  const items = [
    'Application awareness',
    'Contextual controls',
    ...(flowEnabled ? ['Flow enabled'] : []),
    isPhysical ? 'Noma connected' : 'Virtual Noma ready'
  ]

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-4xl font-semibold text-neutral-50">You&rsquo;re ready.</h1>
      <p className="mt-3 text-sm text-neutral-500">Noma will adapt as you work.</p>

      <ul className="mt-8 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-neutral-300">
            <span className="text-accent" aria-hidden="true">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <OnboardingButton onClick={onStart}>Start using Noma</OnboardingButton>
      </div>
    </div>
  )
}
