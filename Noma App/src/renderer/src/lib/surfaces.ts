/**
 * Shared surface class strings (v2, light-first — 2026-09-15). Deliberately
 * restrained: a thin border plus a very small, low-opacity ambient shadow,
 * never a glass gradient sheen, never a colored glow. "Premium" here means
 * everything reads as intentional at a glance, not that every surface is
 * elevated — most of the app should feel like one calm canvas
 * (`bg-base-950`) with occasional, genuinely-necessary white cards on top.
 */

/** The scrim behind a modal — a soft, mostly-transparent wash over real
 *  page content, not a heavy black-out. */
export const MODAL_SCRIM = 'fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]'

/** A modal panel: white, a thin neutral border, a small close shadow.
 *  Callers still supply their own `max-w-*`/`p-*`. */
export const GLASS_PANEL = 'rounded-2xl border border-base-700 bg-base-900 shadow-[0_12px_28px_-16px_rgba(23,23,25,0.18)]'

/** The same recipe, for an inline card rather than a full modal — one
 *  shade lighter a shadow, otherwise identical. This is the *only* card
 *  treatment in the app; don't invent a second one per page. */
export const GLASS_CARD = 'rounded-2xl border border-base-700 bg-base-900 shadow-[0_6px_16px_-10px_rgba(23,23,25,0.14)]'

/**
 * The physical "keycap" material shared by ControlTile (read-only) and
 * VirtualControlButton (pressable) — a control should read as a small,
 * tactile object, not a dashboard tile. A single soft ambient shadow (no
 * inset highlight theatrics) is enough on a light surface to lift it
 * slightly off the page.
 */
export const KEYCAP_SHADOW = 'shadow-[0_2px_8px_-4px_rgba(23,23,25,0.16)]'
