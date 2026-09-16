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
 * shortcut (never an invented description) set in mono underneath. A
 * filled control lifts slightly on hover (a real physical control invites
 * a press) — an empty slot stays flat, since there's nothing to press yet
 * — see VirtualControlButton for the interactive twin used on the Virtual
 * Keyboard page.
 */
export function ControlTile({ slot, control, application }: ControlTileProps) {
  const caption = actionCaption(control?.action)
  const glyph = actionGlyph(control?.action)

  return (
    <div
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-white/[0.09] bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-150 ${KEYCAP_SHADOW} ${
        control
          ? 'hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white/[0.06] hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.6),0_0_20px_-6px_rgba(99,124,255,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] active:translate-y-0 active:scale-[0.98]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Control {slot}</span>
        {glyph && <span className="text-sm text-neutral-500">{glyph}</span>}
      </div>
      {application && (
        <AppIcon applicationId={application.id} name={application.name} size={22} variant="tile" />
      )}
      <div>
        <div className="truncate text-sm font-medium tracking-wide text-neutral-100">
          {control?.label ?? <span className="text-neutral-500">—</span>}
        </div>
        {caption && <div className="mt-1 truncate font-mono text-xs text-neutral-500">{caption}</div>}
      </div>
    </div>
  )
}
