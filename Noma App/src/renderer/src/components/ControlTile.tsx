import type { Control } from '@shared/types'
import { actionCaption } from '../lib/describeAction'
import { KEYCAP_SHADOW } from '../lib/surfaces'

interface ControlTileProps {
  slot: number
  control: Control | undefined
}

/**
 * A single physical control, read-only — the Home/Controls page's "what
 * does this button do" view. Deliberately tactile rather than a dashboard
 * tile: a small, bordered rectangle referencing the real hardware key, the
 * control's name as the one confident statement on it, and its real
 * shortcut (never an invented description) set in mono underneath — see
 * VirtualControlButton for the interactive twin used on the Virtual
 * Keyboard page.
 */
export function ControlTile({ slot, control }: ControlTileProps) {
  const caption = actionCaption(control?.action)

  return (
    <div
      className={`flex aspect-[4/3] flex-col justify-between rounded-xl border border-base-700 bg-base-900 p-4 transition-colors duration-150 hover:border-neutral-400 ${KEYCAP_SHADOW}`}
    >
      <span className="text-[10px] text-neutral-500">{slot}</span>
      <div>
        <div className="text-sm font-medium tracking-wide text-neutral-100">
          {control?.label ?? <span className="text-neutral-500">—</span>}
        </div>
        {caption && <div className="mt-1 font-mono text-xs text-neutral-500">{caption}</div>}
      </div>
    </div>
  )
}
