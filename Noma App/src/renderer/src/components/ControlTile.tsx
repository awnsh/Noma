import type { Application, Control } from '@shared/types'
import { actionCaption, actionGlyph } from '../lib/describeAction'
import { KEYCAP_SHADOW } from '../lib/surfaces'
import { AppIcon } from './AppIcon'

interface ControlTileProps {
  slot: number
  control: Control | undefined
  /** The application this control's profile belongs to — every tile in a
   *  grid shares the same one, so its `AppIcon` is what gives the whole
   *  grid an immediate visual identity (see product brief section 11).
   *  Optional: callers outside an application-scoped grid (none today)
   *  simply omit it and get the tile's plain layout. */
  application?: Application | null
}

/**
 * A single physical control, read-only — the Home/Controls page's "what
 * does this button do" view. Deliberately tactile rather than a dashboard
 * tile: a small, bordered rectangle referencing the real hardware key, the
 * control's name as the one confident statement on it, and its real
 * shortcut (never an invented description) set in mono underneath. Solid
 * graphite material (Card fill + a real border), not translucent glass —
 * an earlier version had a colored blue glow on hover, which read as an
 * "AI-related" decoration rather than a physical control; the hover
 * feedback now is exactly what a real keycap gives: it lifts slightly, its
 * edge brightens a touch, nothing more. An empty slot stays flat, since
 * there's nothing to press yet — see VirtualControlButton for the
 * interactive twin used on the Virtual Keyboard page.
 */
export function ControlTile({ slot, control, application }: ControlTileProps) {
  const caption = actionCaption(control?.action)
  const glyph = actionGlyph(control?.action)

  return (
    <div
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-base-700 bg-base-850 p-4 transition-all duration-150 ${KEYCAP_SHADOW} ${
        control
          ? 'hover:-translate-y-0.5 hover:border-base-600 active:translate-y-0 active:scale-[0.98]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Control {slot}</span>
        {glyph && <span className="text-sm text-neutral-500">{glyph}</span>}
      </div>
      {application && (
        <AppIcon applicationId={application.id} name={application.name} size={32} variant="tile" />
      )}
      <div>
        <div className="truncate text-sm font-medium tracking-wide text-neutral-100">
          {control?.label ?? <span className="text-neutral-500">–</span>}
        </div>
        {caption && <div className="mt-1 truncate font-mono text-xs text-neutral-500">{caption}</div>}
      </div>
    </div>
  )
}
