---
name: Noma
description: Adaptive modular keyboard app — near-black glass chrome over a signature-blue accent, built to read as premium hardware, not a dev tool.
colors:
  base-950: "#050506"
  base-900: "#09090b"
  base-800: "#131317"
  base-700: "#1c1c21"
  base-600: "#28282f"
  accent: "#4c7eff"
  accent-muted: "#3150a4"
  gold: "#cda15a"
  gold-muted: "#6b5730"
  flow: "#a78bd1"
  flow-muted: "#5c4a78"
  neutral-100: "#eaeaec"
  neutral-200: "#c2c2c8"
  neutral-300: "#98989f"
  neutral-400: "#82828c"
  neutral-500: "#73737d"
  neutral-600: "#5c5c65"
  neutral-700: "#414148"
typography:
  display:
    fontFamily: "Sora Variable, Inter, -apple-system, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontWeight: 500
    letterSpacing: "0.1em"
    textTransform: "uppercase"
  mono:
    fontFamily: "JetBrains Mono, SFMono-Regular, monospace"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  "3xl": "24px"
  rail: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.base-950}"
    rounded: "{rounded.full}"
    padding: "12px 28px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
  button-tinted:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-tinted-hover:
    backgroundColor: "{colors.accent}"
---

# Design System: Noma

## Overview

**Creative North Star: "Frosted metal and glass, at rest in the dark."**

Noma reads as a premium hardware companion — Apple / Logitech / WHOOP
territory — not an engineering dashboard. The ground is always near-black
(this is a dark-only product; there is no light theme). Every surface that
sits *above* the ground plane — the sidebar, modals, the virtual keyboard
deck, elevated cards — gets real materiality: a soft top-lit gradient
sheen, a crisp 1px inset highlight standing in for a glass bevel catching
light, and a genuine offset-plus-blur ambient shadow that separates it
from the plane beneath. Nothing is flat by accident; flatness (plain
borders, no shadow) is reserved for content that is genuinely part of the
background plane, not elevated above it.

One accent color — signature brand blue — carries every interactive/active
state, rendered as a soft glow rather than a flat fill wherever it marks
"this is currently selected/active." Two secondary semantic colors, gold
and flow violet, are reserved narrowly (see Colors) and never used for
general UI decoration.

This system was built 2026-08-31 as a deliberate redesign of an earlier,
flatter dark theme (plain `border + bg-base-900` cards everywhere, no
shadows, no glass) — see `src/renderer/index.html`'s design-contract
comment for the original brief. The old look is not preserved anywhere as
an alternate; every elevated surface should use the recipes below.

**Key Characteristics:**
- Near-black ground, never light — chosen for the use scene (a desktop
  utility running alongside dark-mode dev tools/media apps most of its
  users already run).
- Elevation is real: gradient sheen + inset top highlight + offset/blur
  ambient shadow, on every panel that sits above the base plane.
- One glowing accent blue for "active/interactive now"; gold and flow
  violet are narrow, meaning-carrying exceptions, never decoration.
- Glass/blur is used where it does real work (a floating tooltip over real
  content, a modal scrim over real content) — not as texture for its own
  sake on surfaces with nothing behind them to blur.

## Colors

Near-black neutrals for structure and text, one glowing signature blue for
everything interactive, and two rare, meaning-locked accents.

### Primary
- **Signature Blue** (`#4c7eff`, token `accent`): every active/interactive
  state — the active nav pill's glow, primary buttons, links, focus rings,
  the keyboard's live-status readout. Deliberately not a generic SaaS
  periwinkle; tuned to sit clear of nearby brand blues (VS Code, Discord/
  Stripe). **The One Meaning Rule.** Blue always means "this is the
  interface, active or ready to be pressed" — never repurposed for
  hardware state or Flow's own suggestions (those have their own colors
  below).

### Secondary
- **Gold** (`#cda15a`, token `gold`): reserved exclusively for "a real,
  physical hardware connection exists right now" (`HardwareStatusPill`).
  Never used for anything else, including as a generic warm accent —
  see [[noma-app-colors]] for the full history of this rule.
- **Flow Violet** (`#a78bd1`, token `flow`): reserved exclusively for
  Flow's own cognition — a suggestion card, the Learning Center's history,
  anything that is Flow *noticing and proposing*, as opposed to the
  resulting interface change (which stays blue).

### Neutral
- **Base scale** (`base-950` `#050506` → `base-600` `#28282f`): background
  fills only — the app ground, card fills, modal panels. Never used for
  text.
- **Neutral text scale** (`neutral-100` `#eaeaec` → `neutral-700`
  `#414148`): every text color in the app. 400-700 were deliberately
  rebalanced brighter than the visually-matching `base` values on
  2026-08-31 after a real contrast complaint — see [[noma-app-colors]].
  **The Never-Gray-On-Black-Below-3:1 Rule.** No text color renders below
  roughly 3:1 against `base-950`; the two most-used tiers (400/500) clear
  or nearly clear 4.5:1. Don't reach for a raw Tailwind gray or a darker
  ad-hoc value "for emphasis by dimming" — it will fail this floor.

## Typography

**Display Font:** Sora Variable (with Inter, system-ui fallback)
**Body Font:** Inter (with system-ui fallback)
**Label/Mono Font:** JetBrains Mono, for technical/measurement content only
(shortcut captions, the HOST↔DEVICE log, timestamps) — never as a
"technical-looking" costume elsewhere.

**Character:** Sora's rounded-geometric letterforms echo the "noma"
wordmark; Inter carries all body copy so the pairing reads considered
rather than default-system.

### Hierarchy
- **Display** (600 weight, `text-xl`–`text-4xl`, `font-display`): page
  titles and modal titles only (`Onboarding.tsx`'s screens, every page's
  `<h1>`). Never body copy.
- **Body** (400 weight, `text-sm`): descriptions, supporting copy.
- **Label** (500 weight, `text-[10px]`–`text-xs`, `tracking-widest`
  uppercase, one of the neutral-500/600 tiers): section/field labels
  ("Current Application," "Flow Status"). **The Label-Not-Kicker Rule.**
  These are field labels attached to a value directly below them, never a
  decorative eyebrow floating above an otherwise-complete heading — don't
  add one to a heading that doesn't need it.

## Layout

A fixed-chrome desktop shell: a persistent left icon rail (see Components
→ Navigation) plus a single scrollable content pane, no responsive
breakpoints (this is a desktop window, not a webpage). Page content is
generally `mx-auto max-w-3xl`–`max-w-5xl` with `px-10 py-10`, list/detail
pages (Profiles, Macro Studio) use a fixed `w-72` sidebar + flexible detail
pane. Spacing follows Tailwind's default 4px-multiple scale used
consistently (`gap-1.5`, `p-4`, `p-6`, `mb-8`/`mb-10` between major
sections) — no arbitrary spacing values.

## Elevation & Depth

Layered, not flat. Every surface above the base ground plane carries a
three-part shadow: an inset top highlight (the glass bevel), an ambient
offset+blur shadow (real elevation, never a zero-offset glow), and —
where the surface is meant to read as a physical key rather than a glass
panel — an inset dark shadow simulating a recessed face. Two named
recipes, both in `src/renderer/src/lib/surfaces.ts`:

### Shadow Vocabulary
- **Glass panel** (`GLASS_PANEL`: `shadow-[0_24px_60px_-12px_rgba(0,0,0,.65),inset_0_1px_0_0_rgba(255,255,255,.08)]`
  + a white-to-transparent gradient sheen): modals, the virtual keyboard
  deck, onboarding's hero cards. The "big, floating glass surface" recipe.
- **Glass card** (`GLASS_CARD`: same idea, lighter shadow spread): inline
  cards that aren't full modals (Dashboard's Flow Status card, Demo Mode's
  panels).
- **Keycap** (`KEYCAP_SHADOW`: inset dark + inset top highlight + real
  outer ambient shadow, all three in one `box-shadow`): `ControlTile` and
  `VirtualControlButton` only — the one surface that should look pressed
  *into* its own face while still casting a shadow onto the page, like
  real keycap product photography.
- **Rail glass** (`AppShell.tsx`'s `RAIL_GLASS`): the sidebar's own
  recipe — gradient + inset highlight + a real drop shadow onto the
  content pane, plus `backdrop-blur`/`saturate` kept for when a future
  layout lets content pass under it.

**The Real-Blur-Only Rule.** `backdrop-blur` is applied only where real
content can plausibly sit behind the element (a floating nav tooltip over
page content, a modal scrim over the page behind it). It's also kept on
the sidebar rail as a forward-compatible no-op today (nothing currently
renders behind it) — don't spread `backdrop-blur` onto surfaces purely for
texture; the "glass" read there comes from the gradient/highlight/shadow.

## Shapes

Generous, soft radii — no sharp corners anywhere. `rounded-lg`/`rounded-xl`
(8-16px) for buttons and inputs, `rounded-2xl` (20px) for standard cards
and keycaps, `rounded-3xl` (24px) for hero panels and modals, and a custom
`rounded-[28px]` for the sidebar rail specifically (the single largest,
most rounded surface — it should read as the softest object in the
window). Borders are always a single 1px hairline at `white/[0.08]`
(sometimes `white/10` on unconverted surfaces), never thicker, never
colored except where a state (active/error) requires it.

## Components

### Buttons
- **Shape:** `rounded-md`/`rounded-lg` for the common tinted-outline
  button; `rounded-full` for the onboarding/Dashboard "hero" CTA.
- **Tinted (the app's default primary)**: `border-accent-muted bg-accent/10
  text-accent`, brightening to `bg-accent/20` on hover, `active:scale-
  [0.97]` on press. Used almost everywhere ("+ New Macro," "Save,"
  "Create profile"). **The Tint-Not-Fill Rule.** This is the *default*
  primary action anywhere inside the main app shell — a soft accent tint,
  not a solid fill. Solid fill is reserved for onboarding's single-CTA-
  per-screen moments (see below), where there's exactly one action to
  make unmissable.
- **Solid (onboarding only)**: `bg-accent text-base-950`, full pill radius,
  `hover:opacity-90 active:scale-[0.98]` — deliberately bolder than the
  in-app default, because onboarding is a sequence of one-clear-action
  screens, not a dashboard of many.
- **Secondary/Ghost:** plain `text-neutral-500 hover:text-neutral-300`,
  no border, no fill.
- **Destructive:** `text-neutral-600 hover:text-red-400`, confirmed inline
  (a "Delete? [Delete] [Cancel]" row replaces the button) rather than a
  separate modal — see Do's and Don'ts.

### Cards / Containers
- **Corner Style:** `rounded-2xl` standard, `rounded-3xl` for hero panels.
- **Background:** `bg-base-900`, layered under a `GLASS_CARD`/`GLASS_PANEL`
  gradient sheen for anything elevated.
- **Shadow Strategy:** see Elevation & Depth — never a bare card with zero
  shadow if it's meant to read as sitting above the page.
- **Border:** 1px `white/[0.08]`.

### Inputs / Fields
- **Style:** `rounded-md border border-white/10 bg-base-950`, `text-sm`.
- **Shortcut inputs** are a distinct pattern (`ShortcutRecorder`): a
  read-only display of the recorded combo plus a "Record" button that
  arms a real keydown listener — never a text field you type a combo name
  into by hand.
- **Toggles:** `ToggleSwitch` — a flexbox-positioned knob (not
  absolute+transform, see the component's own doc comment on why), accent
  fill when on.

### Navigation
The left icon rail (`AppShell.tsx`) is a floating glass panel, inset from
the window edges (`p-3` gap all around), `rounded-[28px]`, holding two
groups: primary product pages, then a soft-fade divider, then Demo/
Developer pinned to the bottom via `mt-auto` — presentation and
engineering tools are visually subordinate to the pages a real user
actually works in. Each icon button is `rounded-xl`; the active page gets
a soft accent glow (`bg-accent/15` + a real offset+blur `shadow` + a thin
`ring-accent/30`), never a flat gray highlight. Hover reveals a small
glass tooltip (real `backdrop-blur`, since real page content sits behind
it) rather than a browser-default `title` tooltip alone.

## Do's and Don'ts

### Do:
- **Do** give every surface that sits above the base plane a real shadow
  (`GLASS_PANEL`/`GLASS_CARD`/`KEYCAP_SHADOW` from `lib/surfaces.ts`) —
  never a bare `border + bg-base-900` with nothing else.
- **Do** keep gold and flow violet meaning-locked (real hardware contact;
  Flow's own cognition, respectively) — reach for accent blue for
  anything else, including new features.
- **Do** check any new text color's contrast against `base-950` before
  reaching for a `neutral-600`/`700` tier — see the Never-Gray-On-Black
  rule above.
- **Do** use `active:scale-[0.97]` (in-app) or `active:scale-[0.98]`
  (onboarding) on every clickable button for tactile press feedback.

### Don't:
- **Don't** introduce a second "glass" recipe with different shadow/
  gradient values — extend `lib/surfaces.ts`'s constants instead of
  hand-rolling a new one inline.
- **Don't** apply `backdrop-blur` to a surface with nothing real behind it
  purely for texture — the "Real-Blur-Only Rule" above.
- **Don't** use a solid accent-fill button inside the main app shell (post-
  onboarding) — that visual weight is reserved for onboarding's single-CTA
  screens.
- **Don't** reintroduce the pre-2026-08-31 flat card look (`rounded-xl
  border border-white/10 bg-base-900`, no shadow) on any new elevated
  surface — it was the explicit thing this redesign replaced.
