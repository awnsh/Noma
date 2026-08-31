import { useEffect } from 'react'
import { useHardwareStore } from '../stores/hardwareStore'

interface HardwareStatusPillProps {
  className?: string
}

/**
 * One shared "is Noma's keyboard connected" indicator, used anywhere that
 * needs it (Dashboard, Virtual Keyboard, Developer) — previously each of
 * those pages built its own slightly different dot+label treatment.
 * Self-contained (refreshes and subscribes itself) so it's a true drop-in,
 * not something the host page has to wire up.
 *
 * `deviceType !== 'virtual'` is the same "is this actually real hardware,
 * not just the on-screen simulator" check onboarding's Hardware screen
 * uses — see src/main/hardware/virtualDevice.ts's doc comment for why
 * that's currently always false (no real transport is wired in yet, so
 * this honestly reads "Virtual Noma" everywhere today, exactly as it
 * should until real hardware exists). Gold, not accent blue, for a real
 * connection — matches the app-wide rule that gold means "real hardware
 * made contact" (see tailwind.config.js).
 */
export function HardwareStatusPill({ className = '' }: HardwareStatusPillProps) {
  const status = useHardwareStore((state) => state.status)
  const refresh = useHardwareStore((state) => state.refresh)
  const subscribe = useHardwareStore((state) => state.subscribe)

  useEffect(() => {
    refresh()
    return subscribe()
  }, [refresh, subscribe])

  const isPhysical = status.connected && status.deviceType !== 'virtual'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        isPhysical ? 'border-gold-muted text-gold' : 'border-white/10 text-neutral-500'
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isPhysical ? 'bg-gold' : 'bg-neutral-700'}`} />
      {isPhysical ? 'Noma connected' : 'Virtual Noma'}
    </span>
  )
}
