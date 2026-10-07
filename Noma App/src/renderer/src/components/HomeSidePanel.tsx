import { useEffect } from 'react'
import type { Application, ApplicationProfile } from '@shared/types'
import { useHardwareStore } from '../stores/hardwareStore'
import { useUiStore } from '../stores/uiStore'
import { AppIcon } from './AppIcon'
import { DEVICE_GLASS_CARD } from '../lib/surfaces'

/** Holo's four swipe-in zones press control slots 1-4. */
const HOLO_ZONES = [
  { slot: 1, name: 'Upper left' },
  { slot: 2, name: 'Upper right' },
  { slot: 3, name: 'Lower left' },
  { slot: 4, name: 'Lower right' }
]

/**
 * Home's right-hand column; product/device context, not more workspace.
 * Three real things, never invented: the actual hardware connection state
 * (`HardwareStatusPill`, already honest about "virtual" vs. real), the
 * product's own four-step loop (Observe/Learn/Adapt/Execute) in its own
 * words, and a live Holo preview built from whatever the currently-focused
 * application's profile actually contains (falls back to the zone name when
 * a slot is empty; never a placeholder brand like "Search"/"Claude"/"Git"),
 * with that same application's real `AppIcon` next to the "Holo" label so
 * the preview reads as "this is what Noma built for what you're doing
 * right now," not a generic device mockup. Clicking the Holo preview
 * navigates there, the same way "See all controls" does on the center
 * column.
 */
export function HomeSidePanel({
  profile,
  application
}: {
  profile: ApplicationProfile | null
  application: Application | null
}) {
  const status = useHardwareStore((state) => state.status)
  const refresh = useHardwareStore((state) => state.refresh)
  const subscribe = useHardwareStore((state) => state.subscribe)
  const setActivePage = useUiStore((state) => state.setActivePage)

  useEffect(() => {
    refresh()
    return subscribe()
  }, [refresh, subscribe])

  return (
    <aside className="w-72 shrink-0 space-y-4">
      <button type="button" onClick={() => setActivePage('holo')} className="block w-full text-left">
        <div className="rounded-2xl bg-holo-bg p-5 transition-transform duration-150 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-holo-muted">
              {application && <AppIcon applicationId={application.id} name={application.name} size={18} />}
              Glide zones{application ? `, ${application.name}` : ''}
            </span>
            <span aria-hidden className="text-holo-muted">
              →
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            {HOLO_ZONES.map(({ slot, name }) => {
              const control = profile?.controls.find((item) => item.slot === slot)
              return (
                <div key={slot} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="shrink-0 text-xs text-holo-muted">{name}</span>
                  <span className={`truncate ${control?.label ? 'text-holo-text' : 'text-holo-muted'}`}>
                    {control?.label || 'Empty'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </button>

      <div className={`${DEVICE_GLASS_CARD} p-5`}>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Noma Device</span>
        {/* A tasteful, honest placeholder for the physical device; no
            spec, no render, just the same four-control layout the app's
            interface actually drives, so the loop ("Noma builds your
            interface" -> "it shows up here too") is visible rather than
            asserted. */}
        <div className="mx-auto mt-5 w-32 rounded-2xl border border-base-700 bg-gradient-to-b from-base-800 to-base-900 p-3">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((slot) => {
              const filled = Boolean(profile?.controls.find((control) => control.slot === slot))
              return (
                <div
                  key={slot}
                  className={`aspect-square rounded-md border ${
                    filled ? 'border-accent-muted bg-accent/10' : 'border-base-700 bg-base-900'
                  }`}
                />
              )
            })}
          </div>
          <div className="mt-2 h-1 w-8 rounded-full bg-base-700" />
        </div>
        {/* Never let "no physical device yet" read as broken. The free
            software experience is a complete product on its own. Same
            "is this actually real hardware" check HardwareStatusPill
            uses; status.connected alone is true even for the virtual
            device, which always reports itself as connected. */}
        {!(status.connected && status.deviceType !== 'virtual') && (
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <p className="text-xs text-neutral-600">Not connected. Use Glide on your laptop instead.</p>
            <button
              type="button"
              onClick={() => setActivePage('holo')}
              className="mt-1.5 text-xs font-medium text-accent hover:opacity-80"
            >
              Open Glide →
            </button>
          </div>
        )}
      </div>

    </aside>
  )
}
