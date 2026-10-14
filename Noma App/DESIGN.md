---
name: Noma
description: A desktop companion that wears the colour of the app you're in.
colors:
  base-950: "#141210"
  base-900: "#181614"
  base-850: "#1e1c19"
  base-800: "#26231f"
  base-700: "#322e2a"
  base-600: "#423d38"
  ink: "#ece8e1"
  ink-muted: "#5a5751"
  ink-subtle: "rgba(236,232,225,0.08)"
  space: "oklch(0.76 var(--space-c) var(--space-h))"
  space-ink: "oklch(0.86 calc(var(--space-c) * 0.7) var(--space-h))"
  space-deep: "oklch(0.27 calc(var(--space-c) * 0.45) var(--space-h))"
  space-wash: "oklch(0.215 calc(var(--space-c) * 0.32) var(--space-h))"
  violet: "#b09ae6"
  violet-muted: "rgba(176,154,230,0.14)"
  violet-note: "#221d2b"
  violet-edge: "rgba(176,154,230,0.22)"
  success: "#7cc49a"
  error: "#ec8a7d"
  gold: "#d4ad66"
  neutral-50: "#fffdf9"
  neutral-100: "#f1ede6"
  neutral-200: "#d9d4cc"
  neutral-300: "#b7b1a9"
  neutral-400: "#9e9891"
  neutral-500: "#8e8982"
  neutral-600: "#7d7871"
  trackpad-face: "#141315"
typography:
  display:
    fontFamily: "Sora Variable, Inter, -apple-system, Segoe UI, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  display-onboarding:
    fontFamily: "Sora Variable, Inter, -apple-system, Segoe UI, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Sora Variable, Inter, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Sora Variable, Inter, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  key: "8px"
  control: "10px"
  plate: "12px"
  tile: "14px"
  sheet: "16px"
  card: "18px"
  modal: "20px"
  trackpad: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  section: "56px"
  page-x: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.base-950}"
    rounded: "{rounded.control}"
    padding: "6px 14px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.neutral-50}"
  button-secondary:
    backgroundColor: "{colors.base-800}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.control}"
    padding: "6px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.base-700}"
  button-quiet:
    textColor: "{colors.neutral-400}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  input:
    backgroundColor: "{colors.base-950}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.base-850}"
    rounded: "{rounded.card}"
  flow-note:
    backgroundColor: "{colors.violet-note}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.card}"
    padding: "28px"
  space-plate:
    backgroundColor: "{colors.space-deep}"
    textColor: "{colors.space-ink}"
    rounded: "{rounded.plate}"
    padding: "8px 10px"
  trackpad:
    backgroundColor: "{colors.trackpad-face}"
    rounded: "{rounded.trackpad}"
    width: "600px"
  trackpad-compact:
    backgroundColor: "{colors.trackpad-face}"
    rounded: "{rounded.trackpad}"
    width: "360px"
  toggle-on:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "24px"
  toggle-off:
    backgroundColor: "{colors.base-950}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "24px"
---

# Design System: Noma

## Overview

**Creative North Star: "App Spaces"**

Noma marks the app you're in with that app's own colour, the way macOS System Settings gives each pane a solid coloured icon tile: a small, solid accent, never a wash. It appears on the app's icon tile (sidebar plate, trackpad centre, workflow steps, Glide toast), the trackpad's swipe chevrons and a lit zone. Switch from VS Code to Spotify and the colour slides over 700ms. Everything else is flat, solid graphite.

**2026-10-14 revision (user feedback: gradients read as "AI slop"):** the coloured window frame, the top-of-page wash, every gradient and every glossy inset top-light were removed. Surfaces are flat solid fills with a hairline border and a soft drop shadow.

**2026-10-14 second revision (user: flat was "too boring"; wants Apple Liquid Glass + Raycast, motion and material):** the window now has a real OS material (`backgroundMaterial: 'acrylic'` on Windows 11, `vibrancy: 'under-window'` on macOS; `nativeTheme.themeSource = 'dark'` so it never renders light, even unfocused). `.noma-window` tints it (rgba(20,18,16,0.55)); the sidebar sits directly on the material. Surfaces are dark liquid glass (`.glass` in globals.css: translucent warm fill, hairline, `backdrop-filter: blur(24px) saturate(150%)`, and a 1px specular rim brightest at the top-left, drawn as a masked border, never a fill). Flow's note is `.glass-violet`. Motion: one glass pill glides to the active nav item (spring easing); pages come into focus with a 220ms blur-to-sharp fade and no travel (pages must not slide or ripple, v0.1.21); cards lift 2px on hover (`.glass-lift`); the Home trackpad sweeps each zone once in the app's colour on arrival (`sweep` prop); the app hue still slides 700ms on app switch. Still no gradient fills or washes.

Everything else stays out of the way: a warm graphite ground (brown-black, never blue-black), off-white ink for the one thing you press, Sora for titles, Inter for reading, JetBrains Mono only for keys and shortcuts. Surfaces are solid materials with real offset shadows: no glass, no glow, no colour on cards. Flow, the part of Noma that notices repeated work, speaks on its own violet paper, so a suggestion never reads as part of the interface. Gold appears only when real hardware is in contact.

The system replaces the earlier one-accent (blue `#4c7eff`) "frosted metal and glass" dashboard. It refuses that pattern specifically: no single brand accent on every control, no uppercase eyebrow labels over sections, no AI gradients or glow, no fake 3D hardware.

**Key Characteristics:**
- One colour per app (OKLCH hue + chroma, fixed lightness), meaning only "where you are".
- Off-white ink is the only "press me" colour; one primary per view.
- Warm graphite ground in six steps; warm neutral text in seven.
- Flat solid surfaces: a hairline border and a soft offset shadow. No gradients, no inset top-lights.
- Sora sentence-case titles; no kickers; mono only for keys.
- The trackpad is the signature object, drawn at one scale everywhere.

## Colors

A warm graphite ground with one moving hue that belongs to the app, not to Noma.

### Primary
- **Ink** (`#ece8e1`): the fill of the single primary button, the on-state of a toggle, the text caret and the focus outline (2px, 2px offset). Off-white the way a dark-mode primary button is filled, so no app's colour is ever mistaken for a control. Hover lifts to `neutral-50`.

### Secondary
- **App Space** (`space`, `oklch(0.76 c h)`): the current app's hue at fixed lightness 0.76, so every app sits at the same brightness on graphite. Hue and chroma come from `lib/appSpace.ts` (e.g. VS Code 248/0.13, Chrome 82/0.13, Spotify 150/0.14, Claude 42/0.11); unknown apps hash to one of eight evenly spread fallback hues at chroma 0.11; no app is warm graphite (70/0.012). Used for swipe chevrons and zone light on the trackpad, and text selection (at 32%).
- **Space Ink** (`space-ink`, L 0.86, 70% chroma): the app's name wherever it's named: the sidebar "In <app>" plate, the trackpad centre, workflow step names, the Glide toast.
- **Space Deep** (`space-deep`, L 0.27, 45% chroma): the solid tile behind the app's icon (sidebar plate, trackpad centre, workflow app tiles, Glide toast badge).
- **Space Wash** (`space-wash`): defined but unused since the frame went neutral; don't reintroduce a coloured frame.

### Tertiary
- **Flow Violet** (`#b09ae6`): Flow's voice only: the dot beside "Flow noticed", the dot in the Noma Notice. Its paper is **Violet Note** (`#221d2b` grading to `#1d1a22`) with a **Violet Edge** border (22% violet).
- **Hardware Gold** (`#d4ad66`): real hardware contact only (HardwareStatusPill, DeviceLogRow).
- **Success** (`#7cc49a`) and **Error** (`#ec8a7d`): status dots and messages ("Glide is ready", a problem line). Never decoration.

### Neutral
- **Window** (`base-950`, `#141210`): the page sheet and field wells.
- **Sidebar ground** (`base-900`, `#181614`).
- **Resting surface** (`base-850`, `#1e1c19`): cards, the running-action bar.
- **Raised surface** (`base-800`, `#26231f`): secondary buttons, modals.
- **Seams** (`base-700` `#322e2a`, `base-600` `#423d38`): secondary hover, outlined tags. Most hairlines are `white/[0.05–0.07]` rather than a solid seam.
- **Text**: `neutral-50` headings, `neutral-100` reading text, `neutral-200` body default, `neutral-300` secondary, `neutral-400/500` quiet, `neutral-600` the faintest that still reads on `base-950`.

### Named Rules
**The Where-You-Are Rule.** The app's colour means only "where you are", and appears only as a small solid accent: the app's icon tile, the swipe chevrons, a lit zone, the app name in the trackpad centre. Never a button, a chart series, a status, or decoration. If removing the hue would lose information about which app this is, it belongs; otherwise it doesn't.

**The Ink Rule.** Off-white ink is the only "press me" colour, and a view has at most one ink button. Everything else is a raised graphite key or a quiet text action.

**The Flow's Voice Rule.** Violet is Flow speaking: a suggestion, something Flow noticed. Never general UI, never a highlight.

**The Real Contact Rule.** Gold appears only when real hardware is connected. No physical device exists for users yet, so in practice it is almost never seen.

## Typography

**Display Font:** Sora Variable (with Inter, system sans fallback)
**Body Font:** Inter 400/500/600 (with system sans fallback), `cv11` and `ss01` on
**Label/Mono Font:** JetBrains Mono 400/500, for keys, shortcuts and counts only

**Character:** Sora's rounded geometry echoes the "noma" wordmark and carries every title; Inter does the reading at a compact desktop size; mono appears only where the text is literally something you type.

### Hierarchy
- **Display** (600, 34px, 1.1, -0.02em): Home's title, which is the current app's name. Onboarding welcome runs larger (44px, 1.05, -0.025em, balanced).
- **Headline** (600, 24px): page titles (Glide, Activity, Learning). Flow's note headline is 22px, -0.01em.
- **Title** (600, 18px): section titles inside a page ("Saved workflows", "What each zone does"), Sora, sentence case.
- **Body** (400, 13px default; 14-16px for longer reading): nav rows, captions, explanations, kept to `max-w-md`/`max-w-lg`.
- **Label** (500, 12px): field labels, plain small text in `neutral-400`, 6px above the field. Group labels in the sidebar are 11px `neutral-300/50`, sentence case.
- **Mono** (400, 11px): shortcut captions under zone actions and workflow steps, occurrence counts. Tabular figures on counts, times and `kbd`.

### Named Rules
**The No-Kicker Rule.** No uppercase, letter-spaced eyebrow or kicker labels. Section titles are Sora in sentence case; field labels are plain small text. Stored action names in capitals ("NEW TAB") are shown sentence-cased ("New tab") by `zoneLabel`; a mixed-case label the user typed is left alone.

**The Mono-Means-Keys Rule.** JetBrains Mono is for things you'd type or count. Never for headings or decoration.

## Layout

Two-part window: a fixed 224px (`w-56`) sidebar on the neutral `base-900` window, and a `base-950` page sheet inset 8px with a 12px radius and a hairline border. Pages are a single centred column (Home `max-w-[760px]`, 48px side padding, 56px top), sections separated by 56px (`mb-14`), with hairline rules (`white/[0.06]`) instead of nested containers inside a section.

Home is fixed in order (user's choice, 2026-10-14): the app name at 34px with a status line, then **Workflows** (Flow's note, or an empty line, then saved workflows), then **Glide in <app>** with the trackpad at 600px. Onboarding centres a single column: logo, a 360px trackpad, the 44px headline, one ink button.

Spacing works on a 4px rhythm: 4/8/16/24 inside components, 56px between sections. The sidebar groups (primary, "More", "Developer") are separated by 12px-margin hairlines; Settings pins to the bottom.

## Elevation & Depth

Flat. A raised surface is a solid fill, a 1px hairline border (`white/[0.07–0.08]`) and one soft offset drop shadow (negative spread). No inset top-lights, no gradients. Depth increases from card to modal to the floating notice. Recessed things (fields, the trackpad face, an off toggle) use an inner shadow instead. No glow, no coloured shadow, no backdrop blur.

### Shadow Vocabulary
- **Card** (`0 8px 24px -16px rgba(0,0,0,0.7)`): the resting surface.
- **Modal** (`0 24px 60px -24px rgba(0,0,0,0.8)`): lifted panels.
- **Trackpad** (`0 12px 32px -20px rgba(0,0,0,0.8)`).
- **Notice** (`0 20px 50px -20px rgba(0,0,0,0.85)`): the floating Noma Notice over the user's own work.
- **Buttons and keys**: no shadow beyond a hairline; flat fills.
- **Recess** (`0 1px 2px 0 rgba(0,0,0,0.4) inset`): fields.

### Named Rules
**The No-Nest Rule.** A card never sits inside a card. Inside a surface, group with spacing and hairline rules.

**The Solid Material Rule.** Surfaces are flat, opaque graphite. No glass, no blur, no gradient, no colour on cards; the app's colour is only ever a small solid accent.

## Shapes

Soft, consistent rounding that grows with the size of the object: 8px small keys and close buttons, 10px controls and fields, 12px the app plate, 14px workflow tiles, 16px the page sheet, 18px cards and notes, 20px modals, 22px the trackpad bezel (19px face). Pills (toggle, Glide toast, status dots) are fully round. Borders are hairlines in warm white at 5.5–8% opacity, never solid light lines.

### The logo mark
The mark (`assets/logo.png`, transparent, light gray) is wide: about **1.56 : 1**. Never put it in a square box without `object-contain`, and never crop it to a circle; both stretch it or clip its curled ends.
- **Next to text** (sidebar, onboarding, Noma Notice): bare mark, width = height x 1.56 (`h-[22px] w-[34px]`, `h-[18px] w-[26px]`), `object-contain`, followed by the wordmark.
- **In a round badge** (Glide toast): the circle is its own element (`h-6 w-6 rounded-full`, now on `space-deep` with an inset hairline ring), and the mark sits inside it at about half the badge width (`h-[9px] w-[13px]`).
- **OS icons** (`resources/`): small sizes are drawn with heavier strokes than a downscale gives, one file per size. Windows tray: `tray-16.png`, `tray-24.png`, `tray.png` (32) added as 1x/1.5x/2x representations; never `resize()` at runtime. macOS menu bar: `trayIconTemplate.png` (16) and `@2x` (32), black on transparent, ~2px strokes at 16.

## Components

### Buttons
Tactile keys with a press: every button scales to 0.98 on `:active` (150ms, ease-out-quart).
- **Shape:** gently rounded (10px).
- **Primary:** ink fill, `base-950` text, 13px medium, 6px x 14px; hover `neutral-50`. One per view.
- **Secondary:** raised graphite key (`base-800`, hairline border, small offset shadow), `neutral-100` text; hover `base-700`.
- **Quiet:** text only in `neutral-400`, faint `white/[0.04]` hover fill: "Not now", "Cancel".
- **Inline link:** `neutral-300` text with a `white/20` underline at 3px offset ("Change zones", "Change").
- **Focus:** a single global rule, 2px ink outline with 2px offset, keyboard (`:focus-visible`) only.
- **Disabled:** 40% opacity, not-allowed cursor.

### Toggle
44 x 24px pill. On: ink track with a `base-950` thumb. Off: recessed `base-950` track with a `neutral-400` thumb. Thumb slides 22px over 200ms.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** `base-850`.
- **Shadow Strategy:** Card shadow (see Elevation).
- **Border:** `white/[0.055]` hairline.
- **Internal Padding:** 20-32px.

### Inputs / Fields
- **Style:** recessed well, `base-950` fill, `white/[0.07]` hairline, 10px radius, 8px x 12px, 14px text, `neutral-600` placeholder. A mono variant for shortcut entry; a compact 12px variant for per-function selects.
- **Label:** plain 12px medium `neutral-400`, 6px above.
- **Focus:** the global ink outline.

### Navigation
Sidebar on the neutral window: logo + wordmark + Beta badge, then the **"In <app>" plate** (`base-850` with a hairline, the app icon on a solid `space-deep` 28px tile, "In" at 11px `neutral-500` over the app name 13px medium `neutral-100`). Nav rows are 13px with a 16px icon from `icons.tsx`, 10px radius; inactive `neutral-300/80`, hover `white/[0.035]`; active `white/[0.07]` fill, medium `neutral-50`. Groups: Home, Glide, Workflows; "More"; "Developer" (only with developer tools on); Settings pinned at the bottom.

### The trackpad (signature component)
`GlideZoneMap`, the one object every Glide surface draws (Home, Glide, onboarding). A 3:2 frame (16px radius, solid `base-850`, hairline, soft shadow) around a flat `base-950` face. Mirrored around its centre line: a 31%-wide strip down each side, split into halves with four zones; zones are unfilled, separated by hairlines, with an inward chevron in `space` at the edge you swipe in from. Zone name 11px `neutral-400`; action 15px semibold `neutral-50` (sentence-cased); shortcut caption 11px mono; "Change"/"Set action" as an underlined link. An empty zone reads "Nothing yet" in `neutral-500`. A just-recognised swipe lights the zone at `space/30`. The centre shows the app's icon on a `space-deep` tile and its name in Sora `space-ink`. Each map can carry another app's space via `spaceStyle()`.

### Flow's note
`HERO_CARD`: a suggestion written on violet paper (solid `violet-note`, `violet-edge` border, 14px radius, 28px padding). The app's tile icon, a 22px Sora headline, a meta line led by a violet dot, the workflow chain, then a hairline-separated action row with one ink primary and quiet secondaries.

### Workflow chain
Steps left to right. An app step is a 14px-radius tile on that app's own `space-deep`, its name in `space-ink`. A keystroke step is a flat `base-800` tile with a hairline with the keyboard icon, its keys beneath in mono `neutral-500`. Nodes reveal in order (`noma-node-in`, staggered).

### Noma Notice and Glide toast
The Notice floats bottom-right in its own transparent window: max 300px, 18px radius, near-opaque violet-tinted graphite with a violet edge, logo + wordmark, a violet dot beside what Flow noticed, a small ink "save" button. Enters with `noma-notice-in` (12px rise), exits shorter and quieter. The Glide toast is a bottom-left pill naming what a swipe ran: round logo badge on `space-deep`, action name 13px medium, the app name in `space-ink/70`; rises, holds, fades in one animation.

### Icons
Hand-drawn stroke icons from `components/icons.tsx` (nav set, app-category glyphs, and Plus, Check, Cross, ArrowRight for actions). Real application icons come from the OS via `AppIcon`.

### Motion
- **Signature:** `--space-h` and `--space-c` are registered `@property` numbers, so a change of app transitions the hue across the whole window over 700ms on `cubic-bezier(0.16, 1, 0.3, 1)`. The onboarding welcome trackpad cycles four apps' colours (VS Code, Chrome, Spotify, Claude) every 2.6s.
- **Primitives:** fade 180ms, rise 220ms (6px), scale-in 240ms (0.97) on ease-out-expo; pages fade only (160ms) without sliding; exits are shorter and ease-in. Transform and opacity only, no looping except the Glide gesture demo.
- **Reduced motion:** animations removed, transitions near-instant; the toast keeps only its fade.

## Do's and Don'ts

### Do:
- **Do** use the app's colour only as a small solid accent: its icon tile (`space-deep`), the swipe chevrons and a lit zone (`space`), the app name in the trackpad centre (`space-ink`).
- **Do** use ink (`#ece8e1`) for the one primary action in a view; everything else is a graphite key or a quiet text action.
- **Do** write section titles in Sora, sentence case, and field labels as plain 12px text.
- **Do** draw the trackpad with `GlideZoneMap` at 600px (360px compact), mirrored left/right, lit from the swipe edge.
- **Do** give a raised surface a solid fill, a hairline and one soft drop shadow; nothing more.
- **Do** reuse the recipes in `lib/surfaces.ts` (CARD, GLASS_PANEL, KEYCAP_SHADOW, HERO_CARD, NOTICE_GLASS, BUTTON_*, FIELD_*) rather than hand-rolling a surface.
- **Do** draw icons from `icons.tsx`.
- **Do** keep the logo mark at 1.56:1 with `object-contain`.

### Don't:
- **Don't** use the app's colour on buttons, charts, statuses or decoration.
- **Don't** use violet for anything but Flow speaking, or gold for anything but real hardware contact.
- **Don't** add uppercase, letter-spaced eyebrow or kicker labels.
- **Don't** nest a card inside a card.
- **Don't** use unicode glyphs as icons (arrows, checks, crosses, plus signs); use `icons.tsx`.
- **Don't** scale the trackpad to fit its container or draw it at a third size.
- **Don't** use gradients of any kind (washes, sheens, top-lit keys), glossy inset highlights, glass, backdrop blur, glow or coloured shadows. The user rejected them as "AI slop" (2026-10-14).
- **Don't** fake 3D hardware or imply a connected device that doesn't exist.
- **Don't** square-crop or circle-crop the logo mark.
