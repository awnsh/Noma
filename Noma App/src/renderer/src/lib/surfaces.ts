/**
 * Shared surface and control recipes (v6, "native", 2026-10-14; see
 * DESIGN.md): shaped like Windows 11 / macOS controls (6px buttons, 8px
 * cards, flat fills), because the glass-and-pill look read as AI-made.
 * Earlier v5 notes, App Spaces: Warm graphite materials with real offset shadows. No glass,
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
  'glass rounded-lg'

/** A card you can hover: lifts slightly, its rim catching more light. */
export const CARD_LIFT = `${CARD} glass-lift`

/** A modal panel: the raised material, lifted further off the page. */
export const GLASS_PANEL =
  'glass rounded-lg bg-[#24211e] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] noma-scale-in'

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
  'glass overflow-hidden rounded-lg'

/**
 * Noma Notice, floating over the user's own work in its own transparent
 * window: the raised material, opaque enough to read over anything.
 */
export const NOTICE_GLASS =
  'rounded-lg border border-white/[0.09] bg-[#22201d] shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)]'

/** What you press. Ink fill, dark text: one per view at most. */
export const BUTTON_PRIMARY =
  'noma-press inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-accent px-3.5 text-[13px] font-semibold text-base-950 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40'

/** Everything else you press: a raised graphite key. */
export const BUTTON_SECONDARY =
  'noma-press inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.06] px-3.5 text-[13px] text-neutral-100 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40'

/** A quiet text action: "Not now", "Cancel". */
export const BUTTON_QUIET =
  'noma-press inline-flex h-8 items-center gap-1 rounded-md px-3 text-[13px] text-neutral-300 hover:bg-white/[0.06] hover:text-neutral-100'

/** Form field recipes shared by the modals and the macro editor. */
export const FIELD_INPUT =
  'w-full rounded-md border border-white/[0.08] border-b-white/[0.2] bg-black/20 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600'
export const FIELD_INPUT_MONO = `${FIELD_INPUT} font-mono`
/** Compact select used inside per-function cards (ModuleConfigModal). */
export const FIELD_INPUT_SM =
  'w-full rounded-md border border-white/[0.08] bg-black/20 px-2.5 py-1.5 text-xs text-neutral-200'
export const FIELD_LABEL = 'mb-1.5 block text-xs font-medium text-neutral-400'
