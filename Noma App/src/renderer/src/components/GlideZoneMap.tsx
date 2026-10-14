import type { CSSProperties } from 'react'
import { GLIDE_ZONE_LABELS, GLIDE_ZONE_SLOTS, glideZonesFor, type GlideZoneName } from '@shared/constants'
import type { Control, HoloTrackpadZoneCount } from '@shared/types'
import { actionCaption } from '../lib/describeAction'
import { spaceStyle } from '../lib/appSpace'
import { AppIcon } from './AppIcon'

/** Position of each zone on the drawn trackpad. Whole class names only:
 *  Tailwind can't see names assembled at runtime. */
const PLACEMENT: Record<'full' | 'half', Record<GlideZoneName, string>> = {
  full: {
    topLeft: 'left-0 inset-y-0',
    topRight: 'right-0 inset-y-0',
    bottomLeft: 'left-0 inset-y-0',
    bottomRight: 'right-0 inset-y-0'
  },
  half: {
    topLeft: 'left-0 top-0 h-1/2',
    topRight: 'right-0 top-0 h-1/2',
    bottomLeft: 'left-0 bottom-0 h-1/2',
    bottomRight: 'right-0 bottom-0 h-1/2'
  }
}

/** Starter actions are stored in capitals ("NEW TAB"); shown as written
 *  words ("New tab") so the trackpad reads rather than shouts. A label the
 *  user typed in mixed case is left alone. */
export function zoneLabel(label: string | undefined): string {
  if (!label) return ''
  if (label !== label.toUpperCase() || !/[A-Z]/.test(label)) return label
  const lower = label.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** True when a slot has nothing on it yet (a new app's "SLOT n"). */
export function isEmptyControl(control: Control | undefined): boolean {
  return !control || control.action.type === 'none' || (control.action.type === 'shortcut' && control.action.keys.length === 0)
}

/** An inward chevron at the zone's outer edge: the direction you swipe. */
function SwipeMark({ left }: { left: boolean }) {
  return (
    <svg viewBox="0 0 8 12" aria-hidden className={`h-3 w-2 shrink-0 text-space ${left ? '' : 'rotate-180'}`}>
      <path d="M1.5 1.5 6 6l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The trackpad, the one object every Glide surface draws (Home, Glide,
 * onboarding), always at the same scale so it reads as the same thing
 * everywhere. Mirrored around its centre line the way Glide works: a strip
 * down each side, split in halves with four zones, each lit from the edge
 * you swipe in from in the app's colour. Click a zone to change its action
 * when `onEditZone` is given; a lit zone marks the swipe-in just
 * recognised. The centre names the app.
 */
export function GlideZoneMap({
  zoneCount,
  controls,
  flashingZone,
  onEditZone,
  centerLabel,
  centerAppId,
  compact = false,
  sweep = false
}: {
  zoneCount: HoloTrackpadZoneCount
  controls: Control[]
  flashingZone?: GlideZoneName | null
  onEditZone?: (slot: number) => void
  centerLabel?: string
  /** The app these zones belong to: its icon sits in the centre and its
   *  colour lights the zones. */
  centerAppId?: string | null
  /** Smaller, zone names only: for onboarding, where it shares the screen. */
  compact?: boolean
  /** Light each zone once, in order, when the trackpad first appears. */
  sweep?: boolean
}) {
  const style = (centerAppId !== undefined ? spaceStyle(centerAppId) : {}) as CSSProperties
  return (
    <div
      style={style}
      className={`space-transition relative mx-auto aspect-[3/2] w-full ${compact ? 'max-w-[360px]' : 'max-w-[600px]'} glass rounded-[22px] p-[5px]`}
    >
      {/* The glass of the pad: a recessed face inside the bezel. */}
      <div className="absolute inset-[5px] overflow-hidden rounded-[17px] bg-[rgba(8,7,6,0.55)]">
        {glideZonesFor(zoneCount).map((zone, zoneIndex) => {
          const slot = GLIDE_ZONE_SLOTS[zone]
          const control = controls.find((item) => item.slot === slot)
          const empty = isEmptyControl(control)
          const left = zone.endsWith('Left')
          const lit = flashingZone === zone
          const content = (
            <>
              <span className={`flex items-center gap-1.5 text-[11px] text-neutral-400 ${left ? '' : 'flex-row-reverse'}`}>
                <SwipeMark left={left} />
                {GLIDE_ZONE_LABELS[zoneCount][zone]}
              </span>
              <span className={`min-w-0 ${compact ? 'hidden' : ''}`}>
                <span className={`block truncate text-[15px] font-semibold leading-tight ${empty ? 'text-neutral-500' : 'text-neutral-50'}`}>
                  {empty ? 'Nothing yet' : zoneLabel(control?.label)}
                </span>
                {!empty && (
                  <span className="mt-1 block truncate font-mono text-[11px] text-neutral-400">
                    {control?.action.type === 'macro' ? 'Workflow' : actionCaption(control?.action)}
                  </span>
                )}
                {onEditZone && (
                  <span className="mt-2 block text-[11px] text-neutral-400 underline decoration-white/20 underline-offset-[3px] group-hover:text-neutral-100">
                    {empty ? 'Set action' : 'Change'}
                  </span>
                )}
              </span>
            </>
          )
          const className = `group absolute flex w-[31%] flex-col justify-between overflow-hidden p-3.5 transition-[background-color] duration-700 ${
            sweep && !lit ? 'noma-zone-sweep' : ''
          } ${
            left ? 'items-start text-left' : 'items-end text-right'
          } ${PLACEMENT[zoneCount === 4 ? 'half' : 'full'][zone]} ${
            lit ? 'bg-space/25 [transition-duration:80ms]' : ''
          }`
          return onEditZone ? (
            <button
              key={zone}
              type="button"
              onClick={() => onEditZone(slot)}
              aria-label={`${GLIDE_ZONE_LABELS[zoneCount][zone]} zone: ${empty ? 'nothing yet' : control?.label}. Change action`}
              style={{ animationDelay: `${300 + zoneIndex * 140}ms` }}
              className={`${className} hover:bg-white/[0.03]`}
            >
              {content}
            </button>
          ) : (
            <div key={zone} className={className} style={{ animationDelay: `${300 + zoneIndex * 140}ms` }}>
              {content}
            </div>
          )
        })}
        {/* Seams: the halves of each strip and the strips' inner edges. */}
        <div aria-hidden className="pointer-events-none absolute inset-y-4 left-[31%] w-px bg-white/[0.05]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-4 right-[31%] w-px bg-white/[0.05]" />
        {zoneCount === 4 && (
          <>
            <div aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-px w-[calc(31%-1.5rem)] bg-white/[0.05]" />
            <div aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-px w-[calc(31%-1.5rem)] bg-white/[0.05]" />
          </>
        )}
        {centerLabel && (
          <div className="pointer-events-none absolute inset-x-[33%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2.5 text-center">
            {centerAppId !== undefined && (
              <span className={`glass flex items-center justify-center rounded-[14px] bg-space-deep ${compact ? 'h-10 w-10' : 'h-14 w-14'}`}>
                <AppIcon applicationId={centerAppId} name={centerLabel} size={compact ? 24 : 32} fill />
              </span>
            )}
            <span
              className={`max-w-full truncate leading-snug ${
                centerAppId !== undefined ? 'font-display text-sm font-semibold text-space-ink' : 'text-xs text-neutral-400'
              }`}
            >
              {centerLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
