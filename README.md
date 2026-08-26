# Flow

Adaptive computer interface — software brain and development platform for a
future modular keyboard. See `brainstorm.md` for the full product vision and
build order, `docs/architecture.md` for how this codebase is organized,
`docs/privacy-and-legal.md` for the workflow-capture privacy design, and
`docs/security-review.md` for a focused security self-review (Electron
hardening, capture guarantees, dependency/SQL posture).

**Phase 1** (scaffold, database, basic dashboard UI, module architecture),
**Phase 2** (real Windows application detection, the profile system,
contextual controls), **Phase 3** (Virtual Keyboard page, stateful hardware
simulator, modular slots), **Phase 4** (real workflow capture, pattern
detection), **Phase 5** (the suggestion engine and learning loop), and the
first slice of **Phase 6** (assigning an accepted suggestion to one of the 4
control slots) are done. See "Where things stand" below.

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
Milestone 1. It's meant to be a **functional digital twin**, not a mockup,
but read the next bullet before expecting every control to actually do
something right now:

- A decorative QWERTY layout sits at the top — purely visual, "this
  represents your physical keyboard"; it's never interactive and standard
  typing never touches Flow (see `docs/privacy-and-legal.md`)
- The display strip shows the current application's name, live
- The four control tiles mirror whatever app is focused (switch apps with
  the Flow window still open, or Alt-Tab away and back — the deck updates)
- **Click a control tile.** MUTE in Spotify actually mutes your system
  volume, and CLOSE WINDOW in Chrome actually closes it gracefully (see "A
  real incident" below for both). **RUN/DEBUG/TERMINAL/SEARCH/RELOAD/etc.
  — anything that sends a keyboard shortcut — currently do not send real
  input.** That path caused two real crashes during testing and is
  deliberately disabled (`KEYSTROKE_EXECUTION_ENABLED = false` in
  `actionExecutor.ts`) until it's redesigned and far more thoroughly
  verified. The control still flashes and logs the press either way — the
  event line shows `✓ executed` for the two paths that are real, and
  `✗ Keystroke execution is temporarily disabled...` for everything else.
  See "Real execution" in `docs/architecture.md` for the full picture
- Use "Add Module" to add a Macro / Rotary Encoder / Slider / Display /
  Numpad / Creator module — it appears as a chip immediately; the × removes
  it. Both fire a real `MODULE_CONNECTED`/`MODULE_DISCONNECTED` device event
  under the hood, the same shape a real module plugging into a physical slot
  will report later
- The **Suggestions** panel lives here too (see below) — this is the page
  meant for demos: switch apps, trigger a pattern, accept the suggestion,
  watch the deck update, all on one screen

Back on the Dashboard, the **Workflow Monitoring** panel is where Phase 4
lives:

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
                 # gets captured" cases), pattern detection, hardware device,
                 # suggestion rules, repositories (in-memory SQLite), a full
                 # events->patterns->suggestions integration test, and the
                 # suggestion-accept->control-assignment orchestration
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

Built, then partially disabled after two real incidents (real execution):
pressing a virtual control was made to actually perform the configured
action instead of only simulating it. `actionExecutor.ts` resolves a
`shortcut` action's key names through the same closed vocabulary capture
uses (`keyNames.ts`, shared by both directions) and sends it via
`uiohook-napi`'s synthetic input, refocusing the target window first via
`windowFocus.ts`'s `AttachThreadInput`-based dance and confirming that
focus actually landed before sending anything.

**Incident 1.** Using Chrome's CLOSE TAB control (`Ctrl+W`) on Chrome's last
tab closed its only window and left Chrome running in the background but
unable to open a new one — every `chrome.exe` process had to be killed by
hand before Chrome would launch again (that hard kill, not the original
`Ctrl+W`, is also almost certainly why Chrome's next launch showed a
"restore pages" prompt — `TerminateProcess` never gives an app the chance
to record a clean exit). Fix: `actionExecutor.ts` refuses to send any
window-closing combo (`Alt+F4`, `Ctrl+W`, `Ctrl+Shift+W`, `Ctrl+Q`,
`Ctrl+F4`) as a keystroke at all (`BLOCKED_COMBOS`), and closing got a
genuinely safer replacement: `flowAction: 'closeWindow'`
(`windowClose.ts`) posts `WM_CLOSE` directly to the target window handle —
the exact message a title bar's X button sends. No keystroke, no
focus-stealing (`WM_CLOSE` doesn't need the window focused), never a
forceful kill. Chrome's control 2 (relabeled CLOSE WINDOW) uses this path.

**Incident 2.** Shortly after, pressing RELOAD (a completely ordinary
`Ctrl+R`, nothing to do with closing anything) crashed Chrome. Same
mechanism — the `AttachThreadInput` focus dance immediately followed by
`uIOhook.keyTap` — a different action, a different failure. Two crashes
from one mechanism is enough signal to stop, not enough to know which half
is actually at fault. Fix: **keystroke execution (every `shortcut` and
`macro` control) is now disabled outright** —
`KEYSTROKE_EXECUTION_ENABLED = false` in `actionExecutor.ts`. A
shortcut/macro control still flashes and logs its press; it just never
reaches `keyTap`. `systemCommand` (volume) and `flowAction: 'closeWindow'`
are unaffected and still execute for real, since neither touches
`AttachThreadInput` or `uIOhook` at all. Full account in
`docs/architecture.md`'s "Real execution" section.

Not yet built (by design — see brainstorm.md's build order): the
underused-controls / per-application-behavior pattern categories (deferred —
see the comment atop `patternDetection.ts`), a standalone macro management
UI (macros currently only get created via an accepted sequence suggestion,
not authored freehand), and the fully general Keyboard Control Mapping
editor (section 18 — picking *any* action type for *any* control at *any*
time, not just accepting a suggestion or authoring a macro from a pattern).

## Next logical step

Before anything else: understand *why* the `AttachThreadInput` + `keyTap`
path crashed Chrome twice, and either redesign keystroke execution around
something safer (a real STM32 device sending real HID keystrokes has none
of this focus-stealing problem in the first place, which is worth sitting
with) or leave it disabled with clear documentation of what was tried.
Re-enabling `KEYSTROKE_EXECUTION_ENABLED` without that understanding would
just be hoping the third time is different.

After that: Phase 7, Developer Mode and the documented STM32 protocol
(`docs/hardware-protocol.md`) — surfacing hardware connection status, the
virtual device's live control/module state, and an incoming/outgoing event
log, which will matter enormously once real firmware exists to debug
against, and not incidentally would have made both incidents above easier
to diagnose in the moment.
