/**
 * Shared surface class strings for the "real app" preview embedded in Holo
 * (AppPreview.tsx and its DashboardDemo/VirtualControlTile children) —
 * mirrors the real app's own `lib/surfaces.ts` GLASS_CARD/KEYCAP_SHADOW
 * recipes (2026-09-16 liquid-glass visual system), re-themed onto this
 * project's own color tokens the same way every other ported component on
 * this site is. The real app reserves this glass material for a specific
 * short list of surfaces — Noma Notice, controls, Holo, device status —
 * not its whole UI; this preview only needs the two of those it actually
 * shows (controls, and the suggestion/"Noma Notice" card), so that's all
 * that's ported here. Macro Studio stays flat chrome in the real app too,
 * so `MacroStudioDemo`/`MacroStepRow` deliberately don't use these.
 */

export const DEMO_GLASS_CARD =
  'rounded-2xl border border-base-600/60 bg-base-100/[0.045] backdrop-blur-xl shadow-[0_8px_30px_-14px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.05)]'

export const DEMO_KEYCAP =
  'bg-gradient-to-b from-base-100/[0.055] to-base-100/[0.02] shadow-[0_6px_20px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]'

export const DEMO_HERO_CARD =
  'relative overflow-hidden rounded-3xl border border-base-500/50 bg-base-100/[0.065] backdrop-blur-[28px] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.07)]'
