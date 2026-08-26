interface ControlTileProps {
  slot: number
  label: string | null
}

export function ControlTile({ slot, label }: ControlTileProps) {
  return (
    <div className="flex aspect-[4/3] flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-base-800 to-base-900 p-4 shadow-inner shadow-black/40">
      <span className="text-[10px] uppercase tracking-widest text-neutral-600">
        Control {slot}
      </span>
      <span className="text-lg font-medium text-neutral-100">
        {label ?? <span className="text-neutral-600">—</span>}
      </span>
    </div>
  )
}
