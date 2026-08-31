import { useEffect, useState } from 'react'
import { useHardwareStore } from '../stores/hardwareStore'
import { OnboardingButton } from './OnboardingButton'

interface OnboardingHardwareScreenProps {
  /** `hardwareSkipped` is true unless a real (non-virtual) device is
   *  connected — see the deviceType check below. */
  onContinue: (hardwareSkipped: boolean) => void
}

/**
 * Screen 4 — must work identically whether or not real hardware exists.
 * Today it never can find real hardware: `getDefaultHardwareDevice()`
 * (src/main/hardware/virtualDevice.ts) is always VirtualHardwareDevice,
 * which reports `deviceType: 'virtual'` and connects unconditionally at
 * app start (main/index.ts). STM32HardwareDevice — the real-transport
 * stub — is never wired into the running app. So `isPhysical` below is
 * honestly false in every build today, and this screen always ends on
 * "Continue with Virtual Noma" — exactly the "don't fake a physical
 * connection" behavior stm32Device.ts's own doc comment describes. The
 * `deviceType !== 'virtual'` check is what makes this screen light up
 * correctly the day a real transport is wired in, with no changes needed
 * here.
 */
export function OnboardingHardwareScreen({ onContinue }: OnboardingHardwareScreenProps) {
  const { status, isLoading, refresh, subscribe } = useHardwareStore()
  const [isChecking, setIsChecking] = useState(false)
  const [checkFailed, setCheckFailed] = useState(false)

  useEffect(() => {
    refresh()
    const unsubscribe = subscribe()
    return unsubscribe
  }, [refresh, subscribe])

  const isPhysical = status.connected && status.deviceType !== 'virtual'

  const handleCheckAgain = async (): Promise<void> => {
    setIsChecking(true)
    try {
      const result = await window.flow.pingHardware()
      setCheckFailed(!result.ok)
    } catch {
      setCheckFailed(true)
    }
    await refresh()
    setIsChecking(false)
  }

  const statusLabel = isLoading
    ? 'Detecting…'
    : isPhysical
      ? 'Noma connected'
      : checkFailed
        ? "Noma couldn't connect."
        : 'Waiting for Noma…'

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-3xl font-semibold text-neutral-50">Connect your Noma</h1>
      <p className="mt-3 max-w-sm text-sm text-neutral-500">
        Plug your Noma keyboard into your computer using USB.
      </p>

      <div
        className="my-10 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-white/10 bg-base-900 px-6 py-8"
        role="status"
        aria-live="polite"
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isPhysical ? 'bg-accent' : checkFailed ? 'bg-red-400' : 'bg-neutral-600'
          }`}
          aria-hidden="true"
        />
        <span className="text-sm text-neutral-300">
          {statusLabel}
          {isPhysical && <span className="ml-1 text-accent">✓</span>}
        </span>
      </div>

      {checkFailed && (
        <p className="mb-6 max-w-xs text-xs text-neutral-500">
          Check your USB connection and try again.
        </p>
      )}

      <div className="flex flex-col items-center gap-4">
        {isPhysical ? (
          <OnboardingButton onClick={() => onContinue(false)}>Continue</OnboardingButton>
        ) : (
          <>
            <OnboardingButton onClick={() => onContinue(true)}>
              Continue with Virtual Noma
            </OnboardingButton>
            <OnboardingButton variant="secondary" onClick={handleCheckAgain} disabled={isChecking}>
              {isChecking ? 'Checking…' : checkFailed ? 'Retry' : 'Check again'}
            </OnboardingButton>
          </>
        )}
      </div>
    </div>
  )
}
