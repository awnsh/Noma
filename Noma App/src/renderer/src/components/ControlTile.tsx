import type { Control } from '@shared/types'
import { actionCaption, actionGlyph } from '../lib/describeAction'
import { KEYCAP_SHADOW } from '../lib/surfaces'

interface ControlTileProps {
  slot: number
  control: Control | undefined
}

/** A read-only physical-identity tile — the Dashboard's "what does this
 *  button do" view. See VirtualControlButton for the interactive twin on
 *  the Virtual Keyboard page (same visual language, different job: that
 *  one presses for real and opens the editor). */
export function ControlTile({ slot, control }: ControlTileProps) {
  const caption = actionCaption(control?.action)

  return (
    <div
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-b from-base-800 to-base-900 p-4 ${KEYCAP_SHADOW}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-600">
          Control {slot}
        </span>
        {control && <span className="text-sm text-neutral-500">{actionGlyph(control.action)}</span>}
      </div>
      <div>
        <div className="text-lg font-medium text-neutral-100">
          {control?.label ?? <span className="text-neutral-600">—</span>}
        </div>
        {caption && <div className="mt-0.5 font-mono text-[11px] text-neutral-500">{caption}</div>}
      </div>
    </div>
  )
}
