// Ported from the real app's ControlTile.tsx (src/renderer/src/components) — the
// Dashboard's read-only "what does this button do" view. Not pressable, unlike
// VirtualControlTile: that's real fidelity, the actual Dashboard's tiles are a
// physical-identity readout, only the Virtual Keyboard page's tiles are pressable.

interface AppControlTileProps {
  slot: number
  label?: string
  caption?: string
}

export default function AppControlTile({ slot, label, caption }: AppControlTileProps) {
  return (
    <div className="flex aspect-[4/3] flex-col justify-between rounded-2xl border border-base-700 bg-gradient-to-b from-base-800 to-base-900 p-4 shadow-inner shadow-black/40">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-base-500">Control {slot}</span>
        {label && <span className="text-sm text-base-500">⌨</span>}
      </div>
      <div>
        <div className="text-lg font-medium text-base-100">{label ?? <span className="text-base-600">—</span>}</div>
        {caption && <div className="mt-0.5 font-mono text-[11px] text-base-400">{caption}</div>}
      </div>
    </div>
  )
}
