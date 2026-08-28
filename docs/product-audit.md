# Product Audit — Prototype → Product

A ground-truth inspection of the app as it exists today (read against the
actual source, not the roadmap docs), done before starting the "product
prototype" phase. See `README.md` for what shipped in each phase and
`brainstorm.md`/this file's "Recommended changes" for what's next.

## 1. Current strengths

- **The core loop is real, not mocked.** Application detection, contextual
  controls, workflow capture, pattern detection, suggestion generation, and
  control assignment are all live, tested, and wired end-to-end — nothing
  in the primary flow is a hardcoded placeholder. `npm test` covers all of
  it (173 tests).
- **Privacy is architecturally enforced, not just promised.** The
  modifier-gated capture policy is unit-tested against real password-typing
  scenarios; the OS-level hook is literally not installed while monitoring
  is off. This is a genuine differentiator worth keeping visible in the UI,
  not just in docs.
- **The hardware abstraction is real and already exercised.** Every
  `HardwareDevice` method and `DeviceEvent` variant used by
  `VirtualHardwareDevice` today is the exact contract
  `docs/hardware-protocol.md` specifies for a future STM32 device — a
  button press, a module plug-in, a display update all flow through the
  same interface a firmware bridge will implement against.
- **Explainability is real math, not narrative.** Every suggestion's
  confidence percentage has a literal, inspectable arithmetic breakdown
  (`ConfidenceBreakdown`) computed at generation time — not a
  post-hoc-sounding sentence. This is a strong, honest "not an AI keyboard"
  story.
- **New-application bootstrapping already exists**, contrary to what an
  older roadmap section implies. The Dashboard's contextual "Create
  profile" prompt (for a detected app with no profile) and the Profiles
  page's manual "+ New Application Profile" form both create a working
  4-control profile immediately, no database editing required. This did
  not need to be rebuilt.
- **Fail-closed engineering discipline**, demonstrated under real pressure:
  the two Chrome-crash incidents produced a genuine redesign (removing
  `AttachThreadInput` entirely) rather than a patch, and the reasoning is
  documented, not just the fix.

## 2. Current weaknesses

- **The product has no "front door."** There is no onboarding, no landing
  narrative, no explanation of what Noma is before a user is dropped
  straight into a developer-flavored dashboard. A first-time user (or a
  demo audience) has to infer the concept from UI labels.
- **Developer-oriented terminology leaks into the primary UI.** "HOST ↔
  DEVICE Log", "Keystroke Execution: Enabled", raw action strings like
  `shortcut: Control+F5` on the Dashboard/Developer pages are precise and
  honest, but not consumer-facing. This is appropriate for Developer Mode;
  it's currently the *only* mode.
- **No dedicated privacy/settings surface.** The Workflow Monitoring
  toggle lives buried in the Dashboard's lower half with no page of its
  own, and there's no "Clear/Export/Delete my data" affordance anywhere —
  despite `docs/privacy-and-legal.md` explicitly calling a clear-data
  action a Phase-4-era requirement, not later polish.
- **"Insights" is a dead, disabled nav item.** It's been sitting there
  since Phase 1/2 marked "Soon" with no page behind it — the only nav
  entry the user can see but not use, and the only functionality
  brainstorm.md sections 7/19 call for that isn't at least stubbed
  somewhere.
- **No way to demonstrate the product deterministically** (before this
  audit's accompanying work — see "What was built" below). Showing the
  adaptive-interface story required a live, working VS Code/Chrome/Spotify
  install and a real repeated keystroke sequence performed on camera —
  fragile for investor/user-testing contexts.
- **Modules are inert.** A Rotary Encoder Module or Slider Module can be
  added/removed as a chip, but has no configuration UI and no actual
  function assignment (turn → do X, press → do Y) — brainstorm.md section
  10's "assign functions" is unbuilt. Right now every module type looks
  and behaves identically (a chip with a name).
- **No underused-control or per-application-behavior insight**, which is
  explicitly deferred in `patternDetection.ts`'s own doc comment — the
  single most differentiated future suggestion category
  ("Command Palette matters more to you than Search — move it?") doesn't
  exist yet.
- **`STM32HardwareDevice` doesn't exist even as a typed stub.** The
  `HardwareDevice` interface only has one implementation
  (`VirtualHardwareDevice`). Milestone 3 ("swap the virtual device for
  real hardware without rewriting the app") has never actually been
  exercised — there's nothing yet to prove the interface is sufficient.
- **Developer Mode has no controls, only readouts.** Brainstorm.md section
  20 and this phase's spec both call for Ping/Reset/Simulate-Event buttons;
  today's Developer page is display-only (status pills, mapping table,
  scrolling log) — useful for observing, not yet useful for *poking* the
  hardware layer during bring-up.

## 3. UX problems

- Confidence is shown as a bare percentage everywhere except inside an
  expandable "Why?" — good instinct (progressive disclosure), but there's
  no visual distinction between "Flow is fairly sure" and "Flow just barely
  crossed the threshold" at a glance (both show as a plain neutral pill).
- The Dashboard, Virtual Keyboard, and Developer pages all render "current
  controls" with three separate, slightly different-looking components
  (`ControlTile`, `VirtualControlButton` in two modes, and a plain table
  row) for what is conceptually one idea. Not broken, but a visual
  inconsistency a polish pass should collapse or deliberately justify.
- No page transition/empty-state treatment distinguishes "loading" from
  "genuinely nothing here" in a couple of spots (e.g. Profiles' summary
  list first paint). Low-severity, but worth a pass given "premium
  hardware product" is the explicit visual bar.
- The Macro Studio, Learning Center, and Profiles pages are all excellent
  in isolation but were each built as a standalone page with its own
  layout conventions — there's no shared "detail panel" pattern between
  them, which shows up as small inconsistencies (button placement, heading
  sizes) rather than a broken flow.

## 4. Product gaps (features called for but not built)

Ranked roughly by how load-bearing they are to the two questions this
phase exists to answer ("would a real person want this" / "can this
control real hardware"):

1. Demo Mode — **addressed by this phase's implementation work** (see
   below).
2. Onboarding (brainstorm.md-adjacent "Product Development Phase 2"
   Phase 8, this spec's Phase 16) — not built.
3. `STM32HardwareDevice` architecture + a visible Connected/Not Connected
   device-type readout — not built.
4. Developer Mode action buttons (Ping/Reset/Simulate Event/Clear Log) —
   not built.
5. Dedicated Privacy page with Clear/Export/Delete Data — not built (the
   toggle exists; the rest doesn't).
6. Underused-control / per-application-behavior suggestions — not built
   (deliberately deferred, now worth revisiting).
7. Module configuration (function-per-capability, e.g. an encoder's
   turn vs. press) — not built.
8. Adaptive layout recommendations ("would a rotary encoder help here?")
   — not built; depends on #6/#7 existing first.
9. Local product analytics (controls used today, suggestions
   accepted/rejected, etc. as a real page, not just Dashboard's 3 numbers)
   — not built; "Insights" nav slot is reserved but empty.
10. Profile duplication (distinct from Macro duplication, which exists) —
    not built.
11. User-testing feedback mechanism ("Was this useful? Y/N") — not built.

## 5. Recommended changes

**Do:**

- Build Demo Mode first (done this pass — see below). It's the only item
  on this list that directly produces something showable to an outside
  audience, and it validates that the existing pipeline (context service,
  pattern detection, suggestion engine) is solid enough to script against
  without new plumbing — which it was.
- Add a minimal `STM32HardwareDevice` typed stub + a real
  Connected/Not-Connected + Device Type readout next (see "Recommended
  implementation order" below) — small, and it's the one gap that
  specifically de-risks "is the abstraction actually sufficient" before
  real hardware exists to find out the hard way.
- Add Developer Mode's missing action buttons (Ping/Reset/Simulate
  Event/Clear Log) at the same time — they're what makes Developer Mode
  actually useful during STM32 bring-up rather than a passive log viewer.
- Give Workflow Monitoring + Clear/Export/Delete Data an obvious home.
  Doesn't need a full onboarding flow first; can be a straightforward
  Settings/Privacy page reusing the existing toggle.
- Build onboarding once there's a settings/privacy surface to point at
  from step "Let Flow learn" — sequencing it before that would mean
  either skipping the privacy explanation or building it twice.

**Don't (yet):**

- Don't build the full 25-phase list in one pass. Several items (adaptive
  layout recommendations, per-application behavior) depend on
  infrastructure (module capabilities, underused-control detection) that
  doesn't exist yet — building the dependent feature first would mean
  fabricating the data it's supposed to explain.
- Don't touch `WindowsOSAdapter`, the capture pipeline, or the execution
  path (`windowFocus.ts`/`windowClose.ts`/`systemCommands.ts`). These are
  hardened, tested, and carry real incident history — see "What should
  not be changed" below.
- Don't add a second demo/mock data path for hardware simulation. Any new
  "simulate a button press" affordance in Developer Mode must call into
  `VirtualHardwareDevice`/the real event pipeline, exactly like Demo Mode's
  `simulateDemoWorkflow()` calls the real `insertWorkflowEvent`.

## 6. Critical vs. optional

**Critical** (blocks one of the two validating questions this phase
exists to answer):

- Demo Mode — done this pass.
- `STM32HardwareDevice` stub + Connected/Not Connected/Device Type
  readout — hardware-readiness question.
- Developer Mode action buttons — hardware-readiness question, and the
  explicit ask of Phase 15.
- A privacy/settings home for the existing toggle + data controls — "would
  a real person want this" hinges partly on trusting it, and the
  monitoring toggle currently reads as buried, not absent.

**Optional / sequence later:**

- Onboarding (valuable, but the app is usable and demoable without it —
  Demo Mode covers the "explain the concept" job for now).
- Underused-control detection, per-application behavior, adaptive layout
  recommendations (valuable long-term differentiators, but each needs
  real usage data to be honest about, per brainstorm.md's "do not invent
  behavior").
- Module configuration UI, profile duplication, local analytics page,
  user-testing feedback mechanism — genuinely useful, not blocking.

---

## What was built this pass

**Demo Mode — "the Noma Moment"** (this phase's #1 priority; see
README.md's "Done — Phase 7: Demo Mode" for the full writeup). A new
**Demo** page walks through: VS Code's contextual controls → switch to
Chrome, controls change → simulate a repeated Copy→Paste workflow → Flow
notices it and explains why (real confidence breakdown) → **Add to
Keyboard** → a control updates for real — deterministic, repeatable, and
routed entirely through the real context/workflow/suggestion pipeline
(`ApplicationContextService.setDemoApplication()`,
`src/main/demo/demoService.ts`), never a separate fake path. Includes a
scoped **Reset Demo** (clears simulated workflow data, restores the two
demo profiles to their seeded controls) so it's safe to re-run for a
second audience. 10 new tests; 173/173 passing; typecheck clean; verified
launching via `npm run dev`.

## Recommended implementation order (after this pass)

1. **`STM32HardwareDevice` architecture stub + Connected/Not
   Connected/Device Type readout.** Small, high-value: proves the
   `HardwareDevice` interface is actually sufficient for a second
   implementation before real hardware exists to discover otherwise.
2. **Developer Mode action buttons** (Ping/Reset/Simulate Event/Clear
   Log), wired through the same interface — the explicit ask of Phase 15,
   and the highest-leverage tool for STM32 bring-up once hardware exists.
3. **Privacy/Settings page** — give the existing Workflow Monitoring
   toggle a real home, add Clear/Export/Delete Data.
4. **Onboarding** — once there's a settings page to route "Let Flow learn"
   into.
5. Underused-control detection → per-application behavior → adaptive
   layout recommendations, in that order (each is real infrastructure the
   next one needs).
6. Module configuration UI, profile duplication, local analytics page,
   user-testing feedback mechanism — as time allows, no hard dependencies
   between them.

## The 3 highest-priority things (as scoped at the start of this pass)

1. **Demo Mode** — done this pass.
2. **`STM32HardwareDevice` stub + Developer Mode action buttons** —
   hardware-readiness, next up.
3. **Onboarding** — product-validation, after a settings/privacy surface
   exists to anchor it.

## What should not be changed

- `WindowsOSAdapter` (`src/main/os/windowsAdapter.ts`) — works, is
  documented in detail, and the PowerShell-helper-process approach was a
  deliberate call given this machine's lack of a C++ toolchain.
- The execution path (`windowFocus.ts`, `windowClose.ts`,
  `systemCommands.ts`, `win32.ts`, `actionExecutor.ts`'s blocklist) —
  carries real incident history and a documented redesign. Any hardware
  work should treat this as a reference for "what a real device avoids by
  construction" (a real STM32 sending real USB HID keystrokes has none of
  Windows' foreground-lock problem), not something to refactor further
  without a specific new failure to fix.
- The learning loop (`patternDetection.ts` → `suggestionRules.ts` →
  `suggestionsRepository.ts`) — deterministic, tested, and explicitly
  brainstorm.md's "not an LLM" design. Extend it (new pattern kinds) rather
  than replace it.
- The IPC contract shape (`FlowApi` in `src/shared/types`, one method per
  channel via `contextBridge`) — this is what
  `docs/security-review.md` cites as preventing a compromised renderer
  from invoking arbitrary main-process handlers. New capabilities should
  add named methods, never a generic passthrough.

## Update — Software Polish & Product Validation Phase

This pass closed 3 of the 4 items this file's "Critical" section listed —
see README.md's "Software Polish & Product Validation Phase" for the full
writeup. Updating this file's status in place rather than leaving it
stale:

- ~~`STM32HardwareDevice` stub + Connected/Not Connected/Device Type
  readout~~ — **done.** `src/main/hardware/stm32Device.ts` + Developer's
  Hardware Connection card.
- ~~Developer Mode action buttons (Ping/Reset/Simulate Event/Clear Log)~~
  — **done.** Developer's "Hardware Bring-Up Tools" section.
- ~~A privacy/settings home for the existing toggle + data controls~~ —
  **done.** The new Settings page.
- Onboarding — **still not built.** Sequencing reasoning in this file's
  original "Recommended implementation order" still holds.

Also done, pulled up from "Optional / sequence later" since it was cheap
once the above existed: module configuration (Rotary Encoder/Slider only —
button-per-key modules are still unconfigured, see README's "what remains
incomplete"), and a first pass at the "three separate, slightly
different-looking components for one idea" UX problem this file flagged
(`ControlTile`/`VirtualControlButton` now share one caption/glyph
convention; Developer's raw table row is intentionally still different —
it's the engineer view, not the consumer one).

Still open, unchanged from this file's original list: underused-control/
per-application-behavior suggestions, adaptive layout recommendations,
local analytics page, user-testing feedback mechanism, profile
duplication, and full per-key configuration for Macro/Numpad/Creator
modules.
