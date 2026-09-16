/**
 * Shared surface class strings for the "real app" preview embedded in Holo
 * (AppPreview.tsx and its DashboardDemo/AppControlTile/VirtualControlTile
 * children) — mirrors the real app's own `lib/surfaces.ts` recipes, kept in
 * sync by hand the same way every other ported component on this site is.
 *
 * Updated 2026-09-17 for the real app's v4 "restrained graphite hardware"
 * system, which replaced its earlier liquid-glass-everywhere look: real
 * feedback there was that translucent-white cards with a colored glow read
 * as generic "AI SaaS," not a premium hardware product. The fix carries
 * over here unchanged — solid card fill (this project's own opaque
 * `base-850`, not a translucent white overlay), a real border, a plain dark
 * shadow, no backdrop-blur, no colored glow, no gradient background.
 */

export const DEMO_CARD = 'rounded-2xl border border-base-600 bg-base-850 shadow-[0_10px_28px_-16px_rgba(0,0,0,0.55)]'

/** The physical "keycap" material — a subtle top-lit brightness gradient
 *  (never a color), like a real key catching ambient light. */
export const DEMO_KEYCAP =
  'bg-gradient-to-b from-base-100/[0.05] to-base-100/[0.015] shadow-[0_6px_18px_-10px_rgba(0,0,0,0.55)]'

/** Noma Notice's own surface, one step more elevated than `DEMO_CARD` — no
 *  colored glow layer (an earlier version had one bleeding blue/violet in
 *  from the corners; that's exactly the "AI glow" effect the real app's own
 *  v4 pass removed). The workflow inside the card is what's supposed to
 *  provide the visual interest, not the card's own background. */
export const DEMO_HERO_CARD =
  'relative overflow-hidden rounded-2xl border border-base-600 bg-base-800 shadow-[0_20px_48px_-20px_rgba(0,0,0,0.6)]'
