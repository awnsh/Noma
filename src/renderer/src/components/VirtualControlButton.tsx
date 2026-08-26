import { useState } from 'react'
import type { Control } from '@shared/types'

interface VirtualControlButtonProps {
  slot: number
  control: Control | undefined
  onPress: (controlId: string) => void
}

export function VirtualControlButton({ slot, control, onPress }: VirtualControlButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = (): void => {
    if (!control) return
    onPress(control.id)
    setIsPressed(true)
    window.setTimeout(() => setIsPressed(false), 150)
  }

  return (
    <button
      type="button"
      disabled={!control}
      onClick={handleClick}
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 ${
        control
          ? 'border-white/10 bg-gradient-to-b from-base-800 to-base-900 shadow-inner shadow-black/40 hover:border-accent-muted active:scale-95'
          : 'cursor-default border-white/5 bg-base-900/50'
      } ${isPressed ? 'border-accent/60 shadow-[0_0_0_1px_rgba(125,211,192,0.4)]' : ''}`}
    >
      <span className="text-[10px] uppercase tracking-widest text-neutral-600">
        Control {slot}
      </span>
      <span className="text-lg font-medium text-neutral-100">
        {control?.label ?? <span className="text-neutral-600">—</span>}
      </span>
    </button>
  )
}
