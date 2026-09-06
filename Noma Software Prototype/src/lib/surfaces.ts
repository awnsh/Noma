/**
 * Shared "material" class strings — ported from the Noma App's
 * src/renderer/src/lib/surfaces.ts (same recipes, same reasoning). Kept
 * centralized so every glass/keycap surface in this prototype shares one
 * definition instead of hand-rolled shadow values drifting apart. See
 * Noma App/DESIGN.md's "Elevation & Depth" section for the full rationale.
 */

/** The scrim behind a modal — real, visible blur since there's always real
 *  page content behind it. */
export const MODAL_SCRIM =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'

/** A large floating glass surface: gradient sheen, inset top highlight, a
 *  real offset+blur ambient shadow. The deck, modals, hero cards. */
export const GLASS_PANEL =
  'rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-base-900 bg-base-900 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.08)]'

/** Lighter-weight version of GLASS_PANEL for inline cards. */
export const GLASS_CARD =
  'rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent bg-base-900 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]'

/**
 * The physical "keycap" material: an inset dark shadow for the recessed key
 * face, an inset top highlight for the bevel catching light, and a real
 * outer ambient shadow — the same combination real keycap product
 * photography uses. Used only on the contextual control tiles, the one
 * surface meant to read as a pressable physical key.
 */
export const KEYCAP_SHADOW =
  'shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_20px_-10px_rgba(0,0,0,0.55)]'
