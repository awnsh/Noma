// Ported from the real app's VirtualControlButton.tsx (src/renderer/src/components) —
// same structure and press behavior, re-themed onto this project's own color
// tokens. The real one wires a click to `window.hardware.pressControl` (an
// Electron IPC call); this one just fires the flash locally, which is the
// entire difference between "real app" and "faithful demo of it."

import { useState } from 'react'

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
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-base-600 bg-gradient-to-b from-base-800 to-base-900 p-4 text-left shadow-inner shadow-black/40 transition-all duration-150 hover:border-accent-dim active:scale-95 ${
        isPressed ? 'border-accent/60 shadow-[0_0_0_1px_rgba(91,134,224,0.4)]' : ''
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
