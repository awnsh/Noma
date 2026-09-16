// Ported from the real app's ControlTile.tsx (src/renderer/src/components) — the
// Dashboard's read-only "what does this button do" view. Not pressable, unlike
// VirtualControlTile: that's real fidelity, the actual Dashboard's tiles are a
// physical-identity readout, only the Virtual Keyboard page's tiles are pressable.
// Updated 2026-09-16 to match the real app's liquid-glass visual system
// (KEYCAP_SHADOW's top-lit gradient, the hover lift + accent glow a filled
// control gets, and the app-icon tile the real component now shows).

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
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-base-600/60 bg-base-100/[0.04] p-4 backdrop-blur-xl transition-all duration-150 ${DEMO_KEYCAP} ${
        label ? 'hover:-translate-y-0.5 hover:border-accent/40 hover:bg-base-100/[0.06] hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.6),0_0_20px_-6px_rgba(76,126,255,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-base-500">Control {slot}</span>
      </div>
      {appId && appName && <DemoAppIcon appId={appId} name={appName} size={22} variant="tile" />}
      <div>
        <div className="truncate text-sm font-medium tracking-wide text-base-100">{label ?? <span className="text-base-600">—</span>}</div>
        {caption && <div className="mt-1 truncate font-mono text-xs text-base-500">{caption}</div>}
      </div>
    </div>
  )
}
