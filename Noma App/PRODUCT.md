# Product

<!-- impeccable:product-schema 1 -->

## Platform

web
<!-- Electron desktop app — a Chromium renderer, not a native iOS/Android/adaptive
     surface, so web design conventions (not platform HIG) apply. -->

## Users

People who own (or plan to own) a physical Noma keyboard, plus early
testers/investors/Purdue Innovates evaluators seeing it pre-hardware. The
primary daily user is a power user who switches between a handful of
applications all day (a developer in VS Code, a browser, a media app) and
wants their physical controls to mean something different in each one
without manually reconfiguring anything.

## Product Purpose

Noma is an adaptive modular keyboard: the physical (eventually) and virtual
(today) 4-button deck's meaning changes automatically based on which
application is focused, and "Flow" — a local, deterministic (not AI/cloud)
pattern-detection engine — notices repeated keyboard shortcuts and suggests
promoting them to a dedicated physical control. Success is a user
understanding, within seconds of looking at the app, what their keyboard is
currently doing and why, and trusting that Flow's suggestions are genuinely
useful rather than noisy.

## Positioning

Not a general macro-pad / Stream-Deck-style utility (assign-a-button-by-hand
tools exist already) and not an AI copilot. Noma's mechanism is specifically:
(1) contextual controls that change with the focused application, ported
today onto seeded profiles (VS Code / Chrome / Spotify) with a real profile
editor for any other app, and (2) Flow's local rule-based learning loop
(observe → detect a repeated pattern → explain a suggestion with real
arithmetic, never a black-box score → the user assigns the slot, Flow never
does). Both halves are demonstrable end-to-end today in software, ahead of
the physical hardware shipping.

## Operating Context

Runs as an always-present Electron desktop app (dark theme, no light mode
today) alongside whatever the user is actually working in. Core loops: the
Dashboard (what is Noma doing right now), the Virtual Keyboard (the
day-one-standin for the physical deck — every press really executes),
Macro Studio, Profiles, Settings/Privacy, and a first-launch onboarding
flow. Demo Mode and Developer Mode exist for presentations and hardware
bring-up respectively, not for the primary daily user.

## Capabilities and Constraints

- Real execution: pressing a control actually sends the configured
  keystroke/macro/system command — not a simulation.
- Flow is 100% local/deterministic (SQLite + rule-based pattern detection);
  no network calls, no cloud AI, anywhere in the app. This is a load-bearing
  trust claim already verified against the implementation in a prior pass —
  any new UI must not contradict it.
- No physical hardware exists yet; `getDefaultHardwareDevice()` is always a
  virtual/software device today. Hardware-connected UI states must stay
  honest about this (see `HardwareStatusPill`), never fake a connection.
- Existing design tokens (`tailwind.config.js`): a signature brand blue
  accent (`#4c7eff`), gold (real hardware contact), flow violet (Flow's own
  cognition/suggestions), Sora display / Inter body / JetBrains Mono
  technical fonts — all synced with the sibling marketing site
  (`Noma Website/`) and **not** to be redesigned away; this task is about
  chrome, materiality, and hierarchy, not the brand palette or type family.
- Text-contrast floor: the app's `neutral` gray text scale was deliberately
  rebalanced (2026-08-31) after a real readability complaint — any new glass/
  translucency treatment must not put text back under ~3:1 contrast.

## Brand Commitments

Name "Noma"; the adaptive-suggestion feature is branded "Flow" specifically
(never "AI" in user-facing copy). Existing wordmark/logo assets in
`src/renderer/src/assets/logo.png`. The sibling `Noma Website/` already
established a "liquid glass" floating-pill nav treatment
(`Navigation.tsx`'s `GLASS` class: backdrop-blur-2xl + saturate + a
gradient + an inset top-highlight/bottom-shadow rim) that the user has
explicitly asked to be ported into this app's chrome — treat that
implementation as the literal reference, not just a mood description.

## Product Principles

1. Contextual clarity over feature density — every screen answers "what is
   Noma doing right now" before anything else.
2. Real, not simulated — the virtual keyboard, Flow's suggestions, and every
   status indicator reflect actual system state, never a canned demo (Demo
   Mode is the sole, clearly-labeled exception).
3. Trustworthy by construction — privacy and "is this really connected"
   claims are only ever as strong as what the code actually does.
4. Calm over loud — one accent color family, restrained motion, no
   gamification.

## Evidence on Hand

Real, working code for every capability above (this is a functioning
pre-hardware product, not a mockup). No customer testimonials, pricing, or
production hardware photography exist yet — do not fabricate any.

<!-- PRODUCT.md written from accumulated repository/session evidence rather
     than a fresh user interview: prior sessions in this same project built
     the onboarding flow, the hardware-status system, the color-contrast
     fix, and a first-time-user UX audit, so users/purpose/positioning/
     constraints above are load-bearing facts already established through
     that work, not a guess. Flagged here per Impeccable's init step so a
     future session can tell this file wasn't rubber-stamped. -->
