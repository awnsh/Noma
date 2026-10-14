/**
 * Shared surface and control recipes (v5, App Spaces, 2026-10-14; see
 * DESIGN.md). Warm graphite materials with real offset shadows. No glass,
 * no glow, no colour on surfaces: the app's colour lives only in the
 * sidebar frame, the page wash, and the app's own name and zones
 * (lib/appSpace.ts). Reuse these rather than hand-rolling a card.
 */

/** The scrim behind a modal — a soft, mostly-transparent dark wash over
 *  real page content, not a full black-out. */
export const MODAL_SCRIM = 'fixed inset-0 z-50 flex items-center justify-center bg-[#0b0a0c]/60 p-4 noma-fade-in'

/**
 * The default resting surface: a warm graphite fill a step above the
 * window, a seam you feel more than see, and a real offset shadow. Used
 * for anything that groups content above the page. Never nest one inside
 * another; inside a CARD, group with spacing and hairline rules instead.
 */
export const CARD =
  'rounded-[18px] border border-white/[0.055] bg-base-850 shadow-[0_1px_0_0_rgba(255,250,240,0.04)_inset,0_12px_32px_-18px_rgba(0,0,0,0.75)]'

/** A modal panel: the raised material, lifted further off the page. */
export const GLASS_PANEL =
  'rounded-[20px] border border-white/[0.07] bg-base-800 shadow-[0_1px_0_0_rgba(255,250,240,0.05)_inset,0_28px_70px_-24px_rgba(0,0,0,0.8)] noma-scale-in'

/** HomeSidePanel's Noma Device card: the same material as CARD (the device
 *  is not real yet, so it gets no special finish). */
export const DEVICE_GLASS_CARD = CARD

/**
 * A key you could press: a soft top-lit face and a shadow underneath, like
 * a real key. ControlTile and VirtualControlButton.
 */
export const KEYCAP_SHADOW =
  'bg-gradient-to-b from-[rgba(255,250,240,0.055)] to-[rgba(255,250,240,0.02)] shadow-[0_1px_0_0_rgba(255,250,240,0.07)_inset,0_-1px_0_0_rgba(0,0,0,0.35)_inset,0_8px_18px_-10px_rgba(0,0,0,0.75)]'

/** Flow's note: a suggestion is written on its own violet paper, so it
 *  reads at a glance as Flow speaking, never as part of the interface. */
export const HERO_CARD =
  'relative overflow-hidden rounded-[18px] border border-violet-edge bg-gradient-to-b from-violet-note to-[#1d1a22] shadow-[0_1px_0_0_rgba(214,200,255,0.07)_inset,0_14px_36px_-18px_rgba(0,0,0,0.8)]'

/**
 * Noma Notice, floating over the user's own work in its own transparent
 * window: the raised material, opaque enough to read over anything.
 */
export const NOTICE_GLASS =
  'rounded-[18px] border border-violet-edge bg-gradient-to-b from-[rgba(36,30,46,0.98)] to-[rgba(30,27,34,0.98)] shadow-[0_1px_0_0_rgba(255,250,240,0.05)_inset,0_24px_60px_-20px_rgba(0,0,0,0.85)]'

/** What you press. Ink fill, dark text: one per view at most. */
export const BUTTON_PRIMARY =
  'noma-press inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-1.5 text-[13px] font-medium text-base-950 shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_6px_14px_-8px_rgba(0,0,0,0.8)] hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40'

/** Everything else you press: a raised graphite key. */
export const BUTTON_SECONDARY =
  'noma-press inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-base-800 px-3.5 py-1.5 text-[13px] font-medium text-neutral-100 shadow-[0_1px_0_0_rgba(255,250,240,0.05)_inset,0_4px_10px_-6px_rgba(0,0,0,0.7)] hover:bg-base-700 disabled:cursor-not-allowed disabled:opacity-40'

/** A quiet text action: "Not now", "Cancel". */
export const BUTTON_QUIET =
  'noma-press inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[13px] text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100'

/** Form field recipes shared by the modals and the macro editor. */
export const FIELD_INPUT =
  'w-full rounded-[10px] border border-white/[0.07] bg-base-950 px-3 py-2 text-sm text-neutral-100 shadow-[0_1px_2px_0_rgba(0,0,0,0.4)_inset] placeholder:text-neutral-600'
export const FIELD_INPUT_MONO = `${FIELD_INPUT} font-mono`
/** Compact select used inside per-function cards (ModuleConfigModal). */
export const FIELD_INPUT_SM =
  'w-full rounded-[10px] border border-white/[0.07] bg-base-950 px-3 py-1.5 text-xs text-neutral-200'
export const FIELD_LABEL = 'mb-1.5 block text-xs font-medium text-neutral-400'
