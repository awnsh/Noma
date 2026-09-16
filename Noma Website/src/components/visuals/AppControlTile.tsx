// Ported from the real app's ControlTile.tsx (src/renderer/src/components) — the
// Dashboard's read-only "what does this button do" view. Not pressable, unlike
// VirtualControlTile: that's real fidelity, the actual Dashboard's tiles are a
// physical-identity readout, only the Virtual Keyboard page's tiles are pressable.
// Updated 2026-09-17 to match the real app's v4 restrained-graphite system: a
// solid Card surface (not translucent glass), a real application icon sized to
// match (32px, up from 22px — the icon is the primary visual identity now, not
// a small mark next to the label), and hover feedback that's real physical
// lift + a brighter edge, not a colored glow.

import DemoAppIcon from './appGlyphIcons'
import { DEMO_KEYCAP } from './demoSurfaces'

interface AppControlTileProps {
  slot: number
  label?: string
  caption?: string
  /** The app this tile belongs to, for its icon — matches the real
   *  `ControlTile`'s `application` prop. Optional: callers outside an
   *  app-scoped grid simply omit it. */
  appId?: string
  appName?: string
}

export default function AppControlTile({ slot, label, caption, appId, appName }: AppControlTileProps) {
  return (
    <div
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-base-600 bg-base-850 p-4 transition-all duration-150 ${DEMO_KEYCAP} ${
        label ? 'hover:-translate-y-0.5 hover:border-base-500' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-base-500">Control {slot}</span>
      </div>
      {appId && appName && <DemoAppIcon appId={appId} name={appName} size={32} variant="tile" />}
      <div>
        <div className="truncate text-sm font-medium tracking-wide text-base-100">{label ?? <span className="text-base-600">—</span>}</div>
        {caption && <div className="mt-1 truncate font-mono text-xs text-base-500">{caption}</div>}
      </div>
    </div>
  )
}
