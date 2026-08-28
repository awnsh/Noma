import { useState } from 'react'
import type { Control } from '@shared/types'
import { actionCaption, actionGlyph } from '../lib/describeAction'

interface VirtualControlButtonProps {
  slot: number
  control: Control | undefined
  onPress: (controlId: string) => void
  /** When true, clicking opens the Control Mapping Editor for this slot
   *  instead of pressing it — see VirtualKeyboard.tsx's "Edit Controls"
   *  toggle. */
  editMode?: boolean
  onEdit?: (slot: number) => void
}

export function VirtualControlButton({
  slot,
  control,
  onPress,
  editMode = false,
  onEdit
}: VirtualControlButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = (): void => {
    if (editMode) {
      onEdit?.(slot)
      return
    }
    if (!control) return
    onPress(control.id)
    setIsPressed(true)
    window.setTimeout(() => setIsPressed(false), 150)
  }

  const caption = actionCaption(control?.action)

  return (
    <button
      type="button"
      disabled={!editMode && !control}
      onClick={handleClick}
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 ${
        editMode
          ? 'border-dashed border-accent-muted/60 bg-base-900 hover:border-accent'
          : control
            ? 'border-white/10 bg-gradient-to-b from-base-800 to-base-900 shadow-inner shadow-black/40 hover:border-accent-muted active:scale-95'
            : 'cursor-default border-white/5 bg-base-900/50'
      } ${isPressed ? 'border-accent/60 shadow-[0_0_0_1px_rgba(125,211,192,0.4)]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-600">
          {editMode ? `Edit · Control ${slot}` : `Control ${slot}`}
        </span>
        {!editMode && control && <span className="text-sm text-neutral-500">{actionGlyph(control.action)}</span>}
      </div>
      <div>
        <div className="text-lg font-medium text-neutral-100">
          {control?.label ?? <span className="text-neutral-600">—</span>}
        </div>
        {!editMode && caption && (
          <div className="mt-0.5 font-mono text-[11px] text-neutral-500">{caption}</div>
        )}
      </div>
    </button>
  )
}
