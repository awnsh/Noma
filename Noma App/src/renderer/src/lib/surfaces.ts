/**
 * Shared surface class strings (v3, dark/OLED liquid-glass —
 * 2026-09-16). A real translucent-glass material — semi-transparent white
 * over the near-black page, real `backdrop-blur`, a thin luminous border,
 * a soft shadow — reserved for the handful of surfaces the product brief
 * calls out as genuinely important (Noma Notice, controls, Holo, device
 * status). Most of the app is still a calm, flat near-black canvas
 * (`bg-base-950`/`bg-base-900`) — glass is a deliberate exception per
 * surface, never the whole page's material. This is the one shared glass
 * vocabulary; don't hand-roll a second recipe inline on a new page.
 */

/** The scrim behind a modal — a soft, mostly-transparent dark wash over
 *  real page content, not a full black-out. */
export const MODAL_SCRIM = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]'

/** A modal panel: dark glass, a thin luminous border, a real ambient
 *  shadow so it visibly lifts off the (already-dark) page behind it.
 *  Callers still supply their own `max-w-*`/`p-*`. */
export const GLASS_PANEL =
  'rounded-2xl border border-white/[0.1] bg-white/[0.06] backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'

/** The same recipe, for an inline card rather than a full modal — very
 *  slightly less opaque, a lighter shadow. This is the *only* card
 *  treatment in the app; don't invent a second one per page. */
export const GLASS_CARD =
  'rounded-2xl border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl shadow-[0_8px_30px_-14px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.05)]'

/**
 * The physical "keycap" material shared by ControlTile (read-only) and
 * VirtualControlButton (pressable) — a control should read as a small,
 * tactile piece of Noma hardware, not a dashboard tile. A subtle internal
 * light gradient (top-lit, like a real keycap catching ambient light)
 * plus the same soft ambient shadow every elevated surface gets.
 */
export const KEYCAP_SHADOW =
  'bg-gradient-to-b from-white/[0.055] to-white/[0.02] shadow-[0_6px_20px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]'

/**
 * The one deliberate escalation above `GLASS_CARD` — reserved for the Noma
 * Moment's hero presentation only (the single most important thing on the
 * Home page), never handed to a second surface. A touch more opaque, a
 * heavier shadow, and a slightly brighter border so it visually outranks
 * the cards around it — the way the app's one truly important moment
 * should — while staying the same glass material as everything else.
 */
export const HERO_CARD =
  'relative overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.065] backdrop-blur-[28px] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.07)]'
