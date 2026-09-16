import { useState } from 'react'
import type { Control } from '@shared/types'
import { actionCaption, actionGlyph } from '../lib/describeAction'
import { KEYCAP_SHADOW } from '../lib/surfaces'

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
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border p-4 text-left backdrop-blur-xl transition-all duration-150 ${
        editMode
          ? 'border-dashed border-accent/40 bg-white/[0.03] hover:border-accent'
          : control
            ? `border-white/[0.09] bg-white/[0.04] ${KEYCAP_SHADOW} hover:border-accent/40 active:scale-95`
            : 'cursor-default border-white/[0.05] bg-white/[0.02]'
      } ${
        // A real press flashes the signature brand blue — this used to be
        // the app's original pre-rebrand teal (rgb(125,211,192), see
        // [[noma-app-colors]]), left behind when the palette migrated.
        isPressed ? 'border-accent/60 shadow-[0_4px_20px_-4px_rgba(99,124,255,0.5)]' : ''
      }`}
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
