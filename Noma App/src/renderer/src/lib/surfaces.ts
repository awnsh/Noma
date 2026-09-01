/**
 * Shared "material" class strings for the app's glass redesign
 * (2026-08-31 — see the design contract in src/renderer/index.html).
 * Centralized so the handful of surfaces that share a material (modal
 * scrims/panels today) don't each redefine slightly different shadow/
 * gradient values by hand.
 */

/** The scrim behind every modal — a real, visible blur now (there's
 *  always real page content behind a modal to blur), not a flat
 *  black wash. */
export const MODAL_SCRIM = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'

/** The modal panel itself: a soft gradient sheen, a crisp inset top
 *  highlight (the "beveled glass edge"), and a real offset+blur ambient
 *  shadow for elevation — the same recipe AppShell's rail uses, sized up
 *  for a larger surface. Callers still supply their own `max-w-*`/`p-*`. */
export const GLASS_PANEL =
  'rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-base-900 bg-base-900 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.08)]'

/** A lighter-weight version of GLASS_PANEL for inline cards (Dashboard's
 *  Flow Status card, etc.) rather than a full modal — same material
 *  language, smaller shadow spread since it's a smaller surface. */
export const GLASS_CARD =
  'rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent bg-base-900 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]'

/**
 * The physical "keycap" material shared by ControlTile (read-only) and
 * VirtualControlButton (pressable) — this is the single most literal
 * "should look like real hardware" surface in the app. Three layers in
 * one box-shadow (Tailwind's shadow-* utilities can't be combined, they
 * all write the same property): an inset dark shadow for the recessed
 * key face, an inset top highlight for the bevel catching light, and a
 * real outer ambient shadow so the whole cap still reads as sitting
 * above the page — the exact combination real keycap product photography
 * uses, not just a flat bordered rectangle.
 */
export const KEYCAP_SHADOW =
  'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_20px_-10px_rgba(0,0,0,0.55)]'
