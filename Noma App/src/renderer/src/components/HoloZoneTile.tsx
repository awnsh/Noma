import { useEffect, useState } from 'react'
import type { Control, HoloZone } from '@shared/types'
import { HOLO_ZONE_LABELS } from '@shared/constants'

interface HoloZoneTileProps {
  zone: HoloZone
  slot: number
  control: Control | undefined
  isCalibrated: boolean
  /** True on the tap right after Flow classifies a tap as *this* zone —
   *  the caller resets it after a short flash, same convention
   *  VirtualKeyboard.tsx's own flash timers use. */
  isFlashing: boolean
}

export function HoloZoneTile({ zone, slot, control, isCalibrated, isFlashing }: HoloZoneTileProps) {
  // A brief local flash independent of the parent's own timer, so rapid
  // repeat taps on the same zone each visibly re-trigger it rather than
  // only the first one showing (a re-set of the same `isFlashing=true`
  // prop wouldn't otherwise restart a CSS transition already at its end
  // state).
  const [flashKey, setFlashKey] = useState(0)
  useEffect(() => {
    if (isFlashing) setFlashKey((key) => key + 1)
  }, [isFlashing])

  return (
    <div
      key={flashKey}
      className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 ${
        isFlashing
          ? 'border-flow/60 bg-flow/[0.08] shadow-[0_4px_20px_-4px_rgba(167,139,209,0.5)]'
          : 'border-white/[0.08] bg-gradient-to-b from-base-800 to-base-900'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-600">
          {HOLO_ZONE_LABELS[zone]} · Slot {slot}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${isCalibrated ? 'bg-accent' : 'bg-neutral-700'}`}
          title={isCalibrated ? 'Calibrated' : 'Not calibrated'}
        />
      </div>
      <div>
        <div className="text-lg font-medium text-neutral-100">
          {control?.label ?? <span className="text-neutral-600">—</span>}
        </div>
        {!isCalibrated && <div className="mt-0.5 text-[11px] text-neutral-600">Not calibrated yet</div>}
      </div>
    </div>
  )
}
