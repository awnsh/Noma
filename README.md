# Noma

Adaptive computer interface — software brain and development platform for a
future modular keyboard. **Noma** is the product/company name; **Flow** is
specifically the adaptive suggestion/pattern-learning feature within it (the
Dashboard's Workflow Monitoring + Suggestions panels) — not the whole app,
even though earlier phases of this README used "Flow" for both. See
`brainstorm.md` for the full product vision and build order,
`docs/architecture.md` for how this codebase is organized,
`docs/privacy-and-legal.md` for the workflow-capture privacy design, and
`docs/security-review.md` for a focused security self-review (Electron
hardening, capture guarantees, dependency/SQL posture).

**Phase 1** (scaffold, database, basic dashboard UI, module architecture),
**Phase 2** (real Windows application detection, the profile system,
contextual controls), **Phase 3** (Virtual Keyboard page, stateful hardware
simulator, modular slots), **Phase 4** (real workflow capture, pattern
detection), **Phase 5** (the suggestion engine and learning loop), the
first slice of **Phase 6** (assigning an accepted suggestion to one of the 4
control slots), and **Phase 7** (Developer Mode and the documented hardware
protocol) are done. See "Where things stand" below.

## Prerequisites

- Node.js 22+ (this machine has 24.19.0 LTS, installed via winget)
- Windows (primary target; the OS layer is abstracted for future macOS support)

## Setup

```powershell
npm install
```

## Run it

```powershell
npm run dev
```

Opens the Flow dashboard in an Electron window. You should see:

- **Current Application** — the real foreground Windows application, updating
  live as you Alt-Tab or click between windows (detected via a PowerShell
  Win32 helper process — see `src/main/os/windowsAdapter.ts`)
- **Current Controls** — four control tiles. Switch focus to VS Code, Chrome,
  or Spotify (seeded profiles) and watch them change; any other app shows
  "No profile configured for X yet" with empty tiles, which is expected —
  the profile system is generic and only these three are seeded for now
- **Flow Status** — real counts from the local SQLite database (starts at 0,
  not faked)

Try it: open VS Code, glance at the dashboard, then switch to Chrome or
Spotify — the controls should update within well under a second, no restart
needed.

Then click **Virtual Keyboard** in the sidebar — this is brainstorm.md's
Milestone 1, a **functional digital twin**: pressing a control performs
the configured action for real.

- A decorative QWERTY layout sits at the top — purely visual, "this
  represents your physical keyboard"; it's never interactive and standard
  typing never touches Flow (see `docs/privacy-and-legal.md`)
- The display strip shows the current application's name, live
- The four control tiles mirror whatever app is focused (switch apps with
  the Flow window still open, or Alt-Tab away and back — the deck updates)
- **Click a control tile and it executes.** RUN in VS Code sends `Ctrl+F5`
  to VS Code, RELOAD in Chrome sends `Ctrl+R`, MUTE in Spotify mutes your
  system volume, CLOSE WINDOW in Chrome closes it gracefully. This path
  caused two real crashes during earlier testing and was rebuilt from
  scratch afterward — see "Two incidents, then a redesign" below for the
  full account, worth reading given the history. The event line shows
  `✓ executed` on success and `✗ <reason>` on failure — a failure is always
  visible, never silent
- Use "Add Module" to add a Macro / Rotary Encoder / Slider / Display /
  Numpad / Creator module — it appears as a chip immediately; the × removes
  it. Both fire a real `MODULE_CONNECTED`/`MODULE_DISCONNECTED` device event
  under the hood, the same shape a real module plugging into a physical slot
  will report later
- The **Suggestions** panel lives here too (see below) — this is the page
  meant for demos: switch apps, trigger a pattern, accept the suggestion,
  watch the deck update, all on one screen

Then click **Developer** in the sidebar — this is Phase 7, brainstorm.md
section 20:

- Three status pills: hardware connection (connected/deviceType/protocol
  version), Workflow Monitoring, and Keystroke Execution — the last one
  shows **Enabled**, but the pill (and the one-line reason if it's ever
  flipped off again) means it's never a silent surprise either way
- **Current Control Mappings** — the live 4 controls for whatever app is
  focused, each with its actual configured action (`shortcut: Control+F5`,
  `systemCommand: volumeMute`, ...), not just a label
- **Modules** — whatever's currently attached, mirroring the Virtual
  Keyboard page
- **HOST ↔ DEVICE Log** — a live, scrolling record of every message
  exchanged with the hardware layer, using the exact message names
  `docs/hardware-protocol.md` documents (`SET_CONTROLS`, `SET_DISPLAY`,
  `BUTTON_PRESS`, `MODULE_CONNECTED`, ...). Switch apps or press a control
  and watch it fill in real time — this is the same log a real firmware
  bridge will need for debugging hardware bring-up, not a separate
  debug-only view

Back on the Dashboard, the **Workflow Monitoring** panel is where Phase 4
lives:

- Its toggle switch's knob had no explicit `left` anchor, so its
  un-transformed position was browser-determined rather than pinned to the
  track's left edge — the fix was giving it one (`ToggleSwitch.tsx`)
- It's **off by default**. Flip it on and Flow starts watching for
  keyboard shortcuts that hold Control, Alt, or the Windows key — nothing
  else. Flip it off and the OS-level hook is released immediately, not just
  ignored (see `docs/privacy-and-legal.md`)
- To see a pattern appear: with monitoring on, press the same shortcut
  (e.g. `Ctrl+S`) 5+ times in whatever app is focused — a "Patterns
  detected today" entry should show up in the panel and the Dashboard's
  Flow Status stat within a keystroke or two. Pressing a virtual control on
  the Virtual Keyboard page 5+ times does the same for "frequently used
  control" patterns
- Thresholds are intentionally not hair-trigger (5 uses for a shortcut/
  control, 3 for a repeated two-step sequence within 15s) — see
  `src/main/workflow/patternDetection.ts` if you want to tune them

Once a pattern crosses its threshold, a **Suggestions** section appears above
Workflow Monitoring — this is Phase 5's learning loop plus Phase 6's slot
assignment, working together:

- Each card shows the suggestion, a plain-language explanation with the real
  count, and a confidence percentage
- Click **Accept** and the card opens an inline picker showing your 4
  current controls (with their current labels) for that application — pick
  one and the shortcut (or a newly-created macro, for a repeated-sequence
  suggestion) is assigned to it immediately, overwriting whatever was there.
  If you're currently focused on that same application, the Dashboard and
  Virtual Keyboard update live, no Alt-Tab needed
- Flow never picks the slot for you — you always choose, every time. See
  `assignSuggestionToControl` in `src/main/applications/suggestionResolution.ts`
- **Reject**/**Dismiss** work as before: the decision is remembered
  permanently (the suggestion is never re-shown), and accept/reject nudge
  future confidence for that same suggestion kind — the deterministic
  UPDATE USER MODEL step from brainstorm.md section 14, inspectable in
  `getConfidenceBiasForKind`

## Test it

```powershell
npm test        # unit tests: capture-policy filter, keydown->combo logic
                 # (including a couple of explicit "typing a password never
                 # gets captured" cases), pattern detection, hardware device
                 # (including its HOST<->DEVICE log), suggestion rules,
                 # repositories (in-memory SQLite), a full events->patterns->
                 # suggestions integration test, the suggestion-accept->
                 # control-assignment orchestration, and the keystroke/
                 # window-close/system-command execution logic
npm run typecheck
```

## Build

```powershell
npm run build
```

## Project structure

```
src/
  main/        Electron main process (Node) — database, IPC, OS/hardware/AI
               abstractions
  preload/     The only bridge between renderer and main (window.flow)
  renderer/    React + TypeScript + Tailwind UI
  shared/      Types and constants used by both main and renderer
docs/
  architecture.md         module layout + hardware-embedding design notes
  privacy-and-legal.md    the workflow-capture policy and why it isn't a keylogger
  security-review.md      Electron hardening, capture guarantees, dependency/SQL posture
  hardware-protocol.md    the HOST<->DEVICE message protocol (implemented today, in-process)
```

## Where things stand vs. the build order

Done (Phase 1): Electron + React + TS + Vite scaffold, SQLite database with
schema, basic dashboard UI, and interface-level architecture for
`os`, `hardware`, and `ai` so later phases implement behind stable contracts
instead of inventing them under deadline.

Done (Phase 2): `WindowsOSAdapter` detects the real foreground application
(polling a persistent PowerShell Win32 helper process — see the "why not a
native module" note in `src/main/os/windowsAdapter.ts`), a profile system
with seed data for VS Code/Chrome/Spotify, and an `ApplicationContextService`
that pushes live application+profile updates to the dashboard over IPC so
the four control tiles change in real time as you switch windows.

Done (Phase 3): `VirtualHardwareDevice` is now real, stateful hardware —
connected state, controls, a display, and modules — driven by the same
`ApplicationContext` from Phase 2. The `HardwareDevice` interface grew a
DEVICE → HOST direction (`onDeviceEvent`/`onStatusChanged`) matching the
future STM32 protocol (section 21), so a button click on the Virtual
Keyboard page raises the exact event shape a real button press will later
raise. Module add/remove works end-to-end from the shared `MODULE_CATALOG`.

Done (Phase 4): `CaptureService` (`src/main/workflow/captureService.ts`) wires
the already-tested `shouldCaptureKeyCombo` policy to a real global keyboard
hook (`uiohook-napi` — another N-API prebuilt-binary dependency, same
reasoning as `better-sqlite3`; see the module's own doc comment for why not
a hand-rolled hook or a node-gyp-based package). It's gated by a
Dashboard-visible Enabled/Disabled toggle backed by a `settings` row, **off
by default**. Control activations on the Virtual Keyboard page feed the same
pipeline. `src/main/workflow/patternDetection.ts` is a small deterministic
engine (no LLM) covering repeated shortcuts, repeated two-step sequences,
and frequently used controls — "Patterns detected" on the Dashboard is real
now, not hardcoded.

Done (Phase 5): `LocalRuleBasedProvider` (`src/main/ai/localProvider.ts`)
implements the `AIProvider` interface from Phase 1 — zero API keys, fully
deterministic. `suggestionRules.ts` turns a `repeatedShortcut` or
`repeatedSequence` pattern into a `Suggestion` with real copy and a
count-scaled confidence; `frequentControl` patterns deliberately produce no
suggestion (not independently actionable — see the file's doc comment).
`SuggestionEngine` orchestrates OBSERVE → IDENTIFY PATTERN → GENERATE
SUGGESTION and is safe to call on every captured event (`insertSuggestionIfNew`
is a no-op once a pattern has already been suggested, in any status).
Accept/Reject/Dismiss close the loop: resolving a suggestion is remembered
permanently (never re-suggested) and, for accept/reject, nudges future
confidence for that pattern kind via a small deterministic bias — the
UPDATE USER MODEL step, inspectable in `suggestionsRepository.ts`, not a
black box.

Done (Phase 6 — slot assignment slice): accepting a suggestion now actually
does something, on the user's explicit terms. `assignSuggestionToControl`
(`src/main/applications/suggestionResolution.ts`) writes a
`repeatedShortcut` suggestion's combo directly onto a chosen control, or, for
a `repeatedSequence` suggestion, creates a `Macro` row
(`macrosRepository.ts`) and assigns *that* to a chosen control — always a
slot the user picked in the UI, never one Flow guesses. The `suggestions`
table gained `application_id`/`action_kind`/`action_payload` via an additive,
backward-compatible migration (`ensureColumn` in `db.ts`) — existing
`flow.db` files pick this up automatically, no reset needed. If the
suggestion's application happens to be the one currently focused, the
Dashboard/Virtual Keyboard update immediately via
`ApplicationContextService.refreshIfCurrentApplication`.

Done (security hardening pass, prompted by an explicit ask): `BrowserWindow`
now sets `contextIsolation`/`nodeIntegration`/`sandbox` explicitly rather
than relying on Electron's current defaults; verified the app still launches
correctly with the OS-level sandbox enabled. Added two tests that
specifically demonstrate — not just assert — that typing a password (with or
without Shift for capitals/symbols) never produces a captured combo, since
it never involves Control/Alt/Meta. Full writeup in
`docs/security-review.md`, including the IPC surface, SQL parameterization,
and dependency posture (`npm audit`: 0 known vulnerabilities as of this
pass).

Done — after two incidents, then a redesign (real execution): pressing a
virtual control performs the configured action for real. `actionExecutor.ts`
resolves a `shortcut` action's key names through the same closed vocabulary
capture uses (`keyNames.ts`, shared by both directions) and sends it via
`uiohook-napi`'s synthetic input, after `windowFocus.ts` refocuses the
target window and confirms the switch actually landed.

**Two incidents, then a redesign.** The original `windowFocus.ts` spawned a
PowerShell child process per press and used `AttachThreadInput` to work
around Windows' foreground-lock restriction. First, using Chrome's CLOSE
TAB control (`Ctrl+W`) on Chrome's last tab closed its only window and left
Chrome running in the background but unable to open a new one — every
`chrome.exe` process had to be killed by hand before Chrome would launch
again (that hard kill, not the original `Ctrl+W`, is also almost certainly
why Chrome's next launch showed a "restore pages" prompt).
Then, shortly after, pressing RELOAD — a completely ordinary `Ctrl+R`,
nothing to do with closing anything — crashed Chrome outright. Same
mechanism, a different action, a different failure: two crashes from one
technique was enough to disable keystroke execution entirely
(`KEYSTROKE_EXECUTION_ENABLED = false`) while it was rebuilt, not patched.

The rebuild: `windowFocus.ts` no longer spawns anything or uses
`AttachThreadInput`. It calls `SetForegroundWindow` **directly from Flow's
own main process**, synchronously, via `koffi` (an FFI library with
prebuilt binaries — no C++ toolchain needed, same reasoning as
`better-sqlite3`/`uiohook-napi`). This isn't a workaround for the
foreground-lock restriction — it sidesteps the restriction entirely,
because Flow's own process genuinely is the current foreground process at
the moment of a click (it just received that click), which is exactly the
ordinary case `SetForegroundWindow` is designed to allow. `windowClose.ts`
and `systemCommands.ts` were migrated to the same direct-call approach for
consistency — neither used `AttachThreadInput`, but both previously
spawned a process per call; now neither does. `KEYSTROKE_EXECUTION_ENABLED
= true` again, with the constant left in place as a single kill switch.
The window-closing keystroke blocklist (`Alt+F4`, `Ctrl+W`,
`Ctrl+Shift+W`, `Ctrl+Q`, `Ctrl+F4`) stayed regardless — closing already
has a strictly safer dedicated path (`flowAction: 'closeWindow'` /
`windowClose.ts`, posting `WM_CLOSE` — the same message a title bar's X
sends, no keystroke, no focus needed at all). Full account in
`docs/architecture.md`'s "Real execution" section.

Done (Phase 7): `docs/hardware-protocol.md` documents the full HOST↔DEVICE
message protocol (`SET_CONTROLS`, `SET_DISPLAY`, `SET_LED`, `BUTTON_PRESS`,
`MODULE_CONNECTED`, ...) — already implemented today via
`VirtualHardwareDevice`, not a future design to interpret later. Every
message it sends/receives is now recorded to an in-memory log
(`getLog()`/`onLogEntry()` in `virtualDevice.ts`, capped at 100 entries)
using those exact names, and the **Developer** page
(`src/renderer/src/pages/Developer.tsx`) shows that log live, alongside
hardware connection status, current control mappings, connected modules,
and a visible Keystroke Execution status pill so its state is never a
silent surprise while poking around the app.

Not yet built (by design — see brainstorm.md's build order): the
underused-controls / per-application-behavior pattern categories (deferred —
see the comment atop `patternDetection.ts`). The general Control Mapping
Editor and a standalone Macro Studio, both listed here as future work when
this section was first written, are now built — see "Product Development
Phase 2" below.

## Next logical step

Test the redesigned execution path across more apps than VS Code/Chrome/
Spotify's seeded shortcuts to build real confidence beyond the reasoning
in `docs/architecture.md` — the theory for *why* the new mechanism avoids
the old failure mode is sound (a real Windows API exception, not a
workaround), but reasoning isn't the same as hours of real use. After
that: a real STM32 device sending real USB HID keystrokes has none of this
focus-stealing problem in the first place, which is worth keeping in mind
for how much further this software-side mechanism is worth hardening
versus simply waiting for real hardware.

## Product Development Phase 2 (a second, distinct roadmap)

A separate, later roadmap — 20 phases turning the technical prototype above
into a convincing *product* prototype (manual control configuration, a
Macro Studio, a Learning Center, onboarding, demo mode, and more). To avoid
colliding with the "Phase 1–7" numbering above (a different roadmap, from
`brainstorm.md`'s original build order), this work is tracked separately
here rather than renumbered into it.

**Done — Phase 1: Control Mapping Editor.** Every control can now be
configured by hand, not just via seed data or an accepted suggestion.
Click **Edit Controls** on the Virtual Keyboard page, then any control
tile, to open the editor: rename it (12-char limit — same physical-display
constraint as everywhere else), pick an action type (shortcut / macro /
launch application / system action / Flow action), and for a shortcut,
*press the keys you want* rather than typing them out —
`ShortcutRecorder.tsx` uses a plain DOM `keydown` listener (no native hook
needed just to record a chord) translated through a shared DOM-code → Flow
vocabulary table (`domKeyCodes.ts`) that's tested to guarantee every
recordable shortcut is actually executable — the exact class of bug that
shipped once already (Spotify's `'Left'`/`'Right'` mistake) can't recur
here. **Test** runs the action for real via the same `executeControlAction`
path a live press uses; **Save** persists through the existing
`controlsRepository.assignControlAction`; **Reset to default** restores a
seeded control via a new `getSeedDefaultControl` lookup. Deliberately
scoped to applications that already have a profile — configuring a
brand-new, never-seen application has no bootstrap path yet, left as a
clean next increment rather than folded into this one.

**Done — Phase 2: Macro Studio.** A dedicated page (nav: **Macro Studio**)
for authoring macros by hand, independent of Flow's suggestion engine.
Macros are no longer just `Control+C → Control+V`-style shortcut chains —
`Macro.actions` is now `MacroStep[]`, reusing `ControlAction`'s own
variants (shortcut / macro / launch application / system action / Flow
action) plus a macro-only `delay` step, so a macro step and a control's
action are drawn from exactly the same executable vocabulary instead of a
second parallel format. The editor is a vertical step timeline (numbered,
connected by a plain CSS rail — no diagramming library): add a step of any
type, reorder with ↑/↓, delete with ✕, record a shortcut step the same way
the Control Mapping Editor does. **Test** runs the in-progress steps for
real (via a new `executeMacroSteps` the `macro` control-action case now
delegates to) even before saving; **Save** creates or updates the row;
**Duplicate** copies it under a new id so editing a copy can never affect
the original or any control already assigned to it; **Delete** warns first
if any control still points at this macro
(`getControlsReferencingMacro`). A macro step can reference *another*
macro — guarded at execution time against both self-reference and
excessive nesting (capped at 3 levels), so a cyclic or runaway chain fails
closed with a clear reason instead of hanging. Assigning a macro to a
control is done right from its editor (pick an application + slot) rather
than only from the Control Mapping Editor, satisfying the spec's "assign
macro to a contextual control" requirement from either direction.

**Done — Phase 3: Explainable Flow Suggestions.** Every suggestion's
confidence percentage now has a real "why?" behind it instead of just a
number. `suggestionRules.ts` was already computing genuine deterministic
math (occurrence count vs. a threshold, plus a bounded nudge from this
pattern kind's historical accept/reject ratio) — that math just wasn't
visible anywhere. It's now captured at generation time as a
`confidenceBreakdown` on the `Suggestion` itself (persisted, so "why am I
seeing this?" always reflects the numbers that were true when the
suggestion was made, not numbers recomputed later against a history that's
since moved on) and rendered as a plain-language sentence behind a "Why?"
toggle on each suggestion card — e.g. *"Occurred 8 times today. That's 3
more than the 5 needed to trigger a suggestion at all, giving a base
confidence of 65%. Flow also remembers 2 of 2 similar suggestions you've
resolved before were accepted, adding 15%."* Deliberately not a fabricated
"AI reasoning" narrative — this is a local rule-based engine, not an LLM
(see `docs/architecture.md`'s "not an AI keyboard" principle), so the
explanation is exactly the arithmetic that ran, stated in plain English.
`suggestionsRepository`'s bias function was renamed
`getSuggestionHistoryForKind` and now returns the raw accepted/rejected
counts alongside the bias value it already computed, since the breakdown
needed both.

**Done — Phase 4: Flow Learning Center.** A new page (nav: **Learning
Center**) that shows Flow's aggregate learning state, not just one
suggestion's. Two parts: a card per actionable pattern kind (repeated
shortcuts, repeated sequences — `frequentControl` is excluded, same
reasoning as suggestionRules.ts: it never produces a suggestion, so it has
no accept/reject history to show) with its real threshold and its live
accepted/rejected counts and resulting confidence bias
(`getLearningStats`, injected with a history lookup the same way
`LocalRuleBasedProvider` is, so it's testable without a database); and a
full suggestion history — every suggestion ever generated, any status, not
just the pending ones the Dashboard shows — each with the same "Why?"
breakdown from Phase 3. That breakdown explainer was pulled out of
`SuggestionCard.tsx` into `lib/explainConfidence.ts` so both places explain
the same numbers the same way instead of maintaining two copies. The page
re-fetches on the existing `SUGGESTIONS_CHANGED` push (accept/reject/
dismiss anywhere in the app invalidates both the history list and the bias
numbers) rather than adding a second push channel.

**Done — Phase 5: Personalized Application Profiles.** Closes the gap
flagged since Phase 1: there was no way to create a profile for an
application at all, only to edit one that already existed (seeded, or
created by accepting a suggestion). Two entry points now exist. First, a
contextual one: the Dashboard already distinguished "no application
detected" from "no profile configured for X yet" — that second case now
gets a **Create profile** button right next to the message, opening a
small form (just a profile name; the application itself is already known
from live detection). Second, a dedicated **Profiles** page for systematic
management: every known application, whether it's been personalized yet,
and — for one without a profile Flow hasn't even detected — a manual
"+ New Application Profile" form (id/display name/process filename typed
by hand, normalized to match how `WindowsOSAdapter` derives an id from a
real detection, so a hand-created profile actually matches later). A new
profile starts with 4 unconfigured controls (an empty shortcut combo — a
deliberate safe no-op, not a placeholder that might do something
unintended) that the user fills in with the same Control Mapping Editor
from Phase 1, reused here unmodified since it was already decoupled from
"is this application currently focused." The Profiles page also handles
the rest of a profile's lifecycle: rename, and delete (with the controls
under it cascading via the existing FK). Small bonus fix found while
building this: `executeControlAction` on an empty/unconfigured shortcut
used to report a blank "Unrecognized key in combo: " — now a clear "This
control has no shortcut set yet."

**Done — Phase 6: Improved Virtual Keyboard.** The decorative "Standard
Keys" section was a purely static picture — 3 letter rows and a blank
spacebar, no modifiers, no function/number/arrow keys, never reacting to
anything. It's now a full, physically laid-out keyboard (function row,
number row, the three letter rows with their real neighbors — brackets,
punctuation, Enter, the modifier row, a separate arrow cluster) that
**flashes the real keys of a real captured shortcut** the instant workflow
monitoring captures one. This reuses the existing capture pipeline as-is —
`captureService`'s already-sanitized, already-privacy-filtered combo (the
same one `insertWorkflowEvent` persists) is now also pushed live to the
renderer over a new `WORKFLOW_COMBO_CAPTURED` channel — so a bare letter
can never light up on its own, only ever as part of a combo that already
passed the Ctrl/Alt/Win gate. That's the actual "digital twin" bar for
this page: not "looks like a keyboard" but "visibly reacts to genuine
input, and only the class of input it's honestly allowed to react to."

Not yet built: Demo Mode, onboarding, and everything else further down the
20-phase list.

Verified: typecheck clean, **163/163 tests pass** (no new — this phase is
UI + thin IPC glue, same category as the rest of `main/index.ts`'s wiring,
which the codebase has never unit-tested separately), app launches
cleanly.
