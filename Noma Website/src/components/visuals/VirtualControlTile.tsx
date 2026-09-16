// Ported from the real app's VirtualControlButton.tsx (src/renderer/src/components) —
// same structure and press behavior, re-themed onto this project's own color
// tokens. The real one wires a click to `window.hardware.pressControl` (an
// Electron IPC call); this one just fires the flash locally, which is the
// entire difference between "real app" and "faithful demo of it." Updated
// 2026-09-16 to match the real app's liquid-glass surface (KEYCAP_SHADOW).

import { useState } from 'react'
import { DEMO_KEYCAP } from './demoSurfaces'

interface VirtualControlTileProps {
  slot: number
  label: string
  caption?: string
  onPress: () => void
}

export default function VirtualControlTile({ slot, label, caption, onPress }: VirtualControlTileProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = () => {
    onPress()
    setIsPressed(true)
    window.setTimeout(() => setIsPressed(false), 150)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-base-600/60 bg-base-100/[0.04] p-4 text-left backdrop-blur-xl transition-all duration-150 hover:border-accent/40 active:scale-95 ${DEMO_KEYCAP} ${
        isPressed ? 'border-accent/60 shadow-[0_4px_20px_-4px_rgba(76,126,255,0.5)]' : ''
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-base-500">Control {slot}</span>
      <div>
        <div className="text-lg font-medium text-base-100">{label}</div>
        {caption && <div className="mt-0.5 font-mono text-[11px] text-base-400">{caption}</div>}
      </div>
    </button>
  )
}
