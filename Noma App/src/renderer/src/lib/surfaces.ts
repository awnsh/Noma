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
  'glass rounded-[16px]'

/** A card you can hover: lifts slightly, its rim catching more light. */
export const CARD_LIFT = `${CARD} glass-lift`

/** A modal panel: the raised material, lifted further off the page. */
export const GLASS_PANEL =
  'glass rounded-[18px] bg-[rgba(30,28,26,0.92)] noma-scale-in'

/** HomeSidePanel's Noma Device card: the same material as CARD (the device
 *  is not real yet, so it gets no special finish). */
export const DEVICE_GLASS_CARD = CARD

/**
 * A key you could press: a soft top-lit face and a shadow underneath, like
 * a real key. ControlTile and VirtualControlButton.
 */
export const KEYCAP_SHADOW =
  'bg-base-800 shadow-[0_4px_10px_-6px_rgba(0,0,0,0.7)]'

/** Flow's note: a suggestion is written on its own violet paper, so it
 *  reads at a glance as Flow speaking, never as part of the interface. */
export const HERO_CARD =
  'glass glass-violet glass-lift overflow-hidden rounded-[18px]'

/**
 * Noma Notice, floating over the user's own work in its own transparent
 * window: the raised material, opaque enough to read over anything.
 */
export const NOTICE_GLASS =
  'rounded-[14px] border border-violet-edge bg-[#221d2b] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]'

/** What you press. Ink fill, dark text: one per view at most. */
export const BUTTON_PRIMARY =
  'noma-press inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-base-950 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.8)] transition-[transform,background-color] duration-200 hover:bg-neutral-50 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40'

/** Everything else you press: a raised graphite key. */
export const BUTTON_SECONDARY =
  'noma-press glass inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium text-neutral-100 transition-transform duration-200 hover:bg-white/[0.07] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40'

/** A quiet text action: "Not now", "Cancel". */
export const BUTTON_QUIET =
  'noma-press inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-neutral-100'

/** Form field recipes shared by the modals and the macro editor. */
export const FIELD_INPUT =
  'w-full rounded-[10px] border border-white/[0.07] bg-base-950 px-3 py-2 text-sm text-neutral-100 shadow-[0_1px_2px_0_rgba(0,0,0,0.4)_inset] placeholder:text-neutral-600'
export const FIELD_INPUT_MONO = `${FIELD_INPUT} font-mono`
/** Compact select used inside per-function cards (ModuleConfigModal). */
export const FIELD_INPUT_SM =
  'w-full rounded-[10px] border border-white/[0.07] bg-base-950 px-3 py-1.5 text-xs text-neutral-200'
export const FIELD_LABEL = 'mb-1.5 block text-xs font-medium text-neutral-400'
