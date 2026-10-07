import { GLIDE_ZONE_LABELS, GLIDE_ZONE_SLOTS, glideZonesFor, type GlideZoneName } from '@shared/constants'
import type { Control, HoloTrackpadZoneCount } from '@shared/types'
import { actionCaption } from '../lib/describeAction'

/** Position of each zone on the drawn trackpad. Whole class names only:
 *  Tailwind can't see names assembled at runtime. */
const PLACEMENT: Record<'full' | 'half', Record<GlideZoneName, string>> = {
  full: {
    topLeft: 'left-0 inset-y-0 rounded-l-2xl border-r',
    topRight: 'right-0 inset-y-0 rounded-r-2xl border-l',
    bottomLeft: 'left-0 inset-y-0 rounded-l-2xl border-r',
    bottomRight: 'right-0 inset-y-0 rounded-r-2xl border-l'
  },
  half: {
    topLeft: 'left-0 top-0 h-1/2 rounded-tl-2xl border-r',
    topRight: 'right-0 top-0 h-1/2 rounded-tr-2xl border-l',
    bottomLeft: 'left-0 bottom-0 h-1/2 rounded-bl-2xl border-r border-t',
    bottomRight: 'right-0 bottom-0 h-1/2 rounded-br-2xl border-l border-t'
  }
}

/** True when a slot has nothing on it yet (a new app's "SLOT n"). */
export function isEmptyControl(control: Control | undefined): boolean {
  return !control || control.action.type === 'none' || (control.action.type === 'shortcut' && control.action.keys.length === 0)
}

/**
 * The trackpad as Glide sees it: a strip down each side (split in halves
 * with four zones), each showing the action it runs. Click a zone to change
 * its action when `onEditZone` is given; a flashing zone marks the swipe-in
 * that was just recognised.
 */
export function GlideZoneMap({
  zoneCount,
  controls,
  flashingZone,
  onEditZone,
  centerLabel,
  compact = false
}: {
  zoneCount: HoloTrackpadZoneCount
  controls: Control[]
  flashingZone?: GlideZoneName | null
  onEditZone?: (slot: number) => void
  centerLabel?: string
  /** Smaller, zone names only: for onboarding, where it shares the screen. */
  compact?: boolean
}) {
  return (
    <div className={`relative mx-auto aspect-[3/2] w-full rounded-2xl ${compact ? 'max-w-xs' : 'max-w-lg'}`}>
      <div className="absolute inset-0 rounded-2xl border border-holo-border bg-holo-surface">
      {glideZonesFor(zoneCount).map((zone) => {
        const slot = GLIDE_ZONE_SLOTS[zone]
        const control = controls.find((item) => item.slot === slot)
        const empty = isEmptyControl(control)
        const left = zone.endsWith('Left')
        const content = (
          <>
            <span className="text-[11px] text-holo-muted">
              {left ? '→ ' : ''}
              {GLIDE_ZONE_LABELS[zoneCount][zone]}
              {left ? '' : ' ←'}
            </span>
            <span className={`min-w-0 ${compact ? 'hidden' : ''}`}>
              <span className={`block truncate text-sm font-medium ${empty ? 'text-holo-muted' : 'text-holo-text'}`}>
                {empty ? 'Nothing yet' : control?.label}
              </span>
              {!empty && (
                <span className="block truncate font-mono text-[10px] text-holo-muted">
                  {control?.action.type === 'macro' ? 'Workflow' : actionCaption(control?.action)}
                </span>
              )}
              {onEditZone && <span className="mt-0.5 block text-[10px] text-accent">{empty ? 'Set action' : 'Change'}</span>}
            </span>
          </>
        )
        const className = `absolute flex w-[30%] flex-col justify-between overflow-hidden border-holo-border p-2.5 text-left transition-colors duration-150 ${
          PLACEMENT[zoneCount === 4 ? 'half' : 'full'][zone]
        } ${flashingZone === zone ? 'bg-accent/25' : 'bg-holo-bg/50'}`
        return onEditZone ? (
          <button
            key={zone}
            type="button"
            onClick={() => onEditZone(slot)}
            aria-label={`${GLIDE_ZONE_LABELS[zoneCount][zone]} zone: ${empty ? 'nothing yet' : control?.label}. Change action`}
            className={`${className} hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
          >
            {content}
          </button>
        ) : (
          <div key={zone} className={className}>
            {content}
          </div>
        )
      })}
      {centerLabel && (
        <div className="pointer-events-none absolute inset-x-[32%] top-1/2 -translate-y-1/2 text-center text-[11px] leading-snug text-holo-muted">
          {centerLabel}
        </div>
      )}
      </div>
    </div>
  )
}
