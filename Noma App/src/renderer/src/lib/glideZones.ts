import { GLIDE_ZONE_LABELS, glideZoneForSlot } from '@shared/constants'

/** "Upper left zone" (or "Control 3" when two-zone Glide can't reach it). */
export function zoneNameForSlot(slot: number, zoneCount: 2 | 4): string {
  const zone = glideZoneForSlot(slot, zoneCount)
  return zone ? `${GLIDE_ZONE_LABELS[zoneCount][zone]} zone` : `Control ${slot} (no swipe with two zones)`
}
