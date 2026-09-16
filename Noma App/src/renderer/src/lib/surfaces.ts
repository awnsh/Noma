/**
 * Shared surface class strings (v4, restrained graphite — 2026-09-17).
 * Supersedes v3's "glass everywhere" system — real feedback was that a
 * translucent-white-on-black card with a colored glow read as generic
 * "AI SaaS," not a premium hardware product (think Apple / Teenage
 * Engineering / Linear, not a neon AI dashboard). The default surface is
 * now solid graphite: a real `base-850` fill, a real `base-700` hex
 * border, a plain dark ambient shadow — no backdrop-blur, no colored glow,
 * no gradient background. Depth comes from the material (fill + border +
 * a soft shadow), not from translucency.
 *
 * Genuine glass survives in exactly the three places called out
 * explicitly: navigation (AppShell's sidebar, built inline, not from
 * these constants), a device surface (Holo's own token group; see
 * `DEVICE_GLASS_CARD` below for HomeSidePanel's Noma Device card), and
 * Noma Notice (`HERO_CARD`) — every other surface in the app should reach
 * for `CARD`, not invent a new translucent recipe.
 */

/** The scrim behind a modal — a soft, mostly-transparent dark wash over
 *  real page content, not a full black-out. */
export const MODAL_SCRIM = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]'

/**
 * The default solid surface — Card fill, real border, a plain shadow.
 * This is what "everything else" (Settings, Learning, Demo panels, modal
 * panels, the onboarding hardware picker, the Noma loop card) should use;
 * don't invent a second flat-card recipe per page.
 */
export const CARD =
  'rounded-2xl border border-base-700 bg-base-850 shadow-[0_10px_28px_-16px_rgba(0,0,0,0.55)]'

/** A modal panel — same solid Card material as everything else, just a
 *  touch more elevated (Elevated fill, a slightly heavier shadow) so it
 *  visibly lifts off the page behind the scrim. Callers still supply their
 *  own `max-w-*`/`p-*`. */
export const GLASS_PANEL =
  'rounded-2xl border border-base-700 bg-base-800 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]'

/**
 * The one deliberate glass surface outside Holo/Noma Notice: HomeSidePanel's
 * Noma Device card, since that one specifically represents the physical
 * device — a light translucency reads as "a piece of hardware's own
 * surface," not decoration. Restrained on purpose: no color tint, modest
 * blur, no glow.
 */
export const DEVICE_GLASS_CARD =
  'rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-md shadow-[0_10px_28px_-16px_rgba(0,0,0,0.55)]'

/**
 * The physical "keycap" material shared by ControlTile (read-only) and
 * VirtualControlButton (pressable) — a control should read as a small,
 * tactile piece of Noma hardware, not a dashboard tile. A subtle internal
 * light gradient (top-lit, like a real keycap catching ambient light) —
 * brightness only, never a color — plus the same soft ambient shadow every
 * elevated surface gets.
 */
export const KEYCAP_SHADOW =
  'bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[0_6px_18px_-10px_rgba(0,0,0,0.55)]'

/**
 * Noma Notice's own surface — the one card allowed a touch of real glass,
 * per the product brief, but restrained: a solid-leaning fill (not the
 * heavy 6.5%-opacity/28px-blur v3 had), a plain border, a plain shadow.
 * No colored glow layer — a past version of this card had one
 * (`HERO_CARD_GLOW`, blue+violet radial gradients bleeding in from the
 * corners); real feedback was that it read as "glowing because it's AI,"
 * exactly the effect this whole system now avoids. The workflow inside the
 * card (see `WorkflowChain`'s real application icons) is what's supposed
 * to provide the visual interest here, not the card's own background.
 */
export const HERO_CARD =
  'relative overflow-hidden rounded-2xl border border-base-700 bg-white/[0.025] backdrop-blur-md shadow-[0_20px_48px_-20px_rgba(0,0,0,0.6)]'
