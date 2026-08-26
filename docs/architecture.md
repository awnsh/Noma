# Flow — Architecture (Phase 1)

## Process layout

Flow is an Electron app split across three processes, built with
`electron-vite`:

- **`src/main`** — Node process. Owns the database, OS integration, hardware
  abstraction, workflow capture, and AI provider. Nothing in the renderer
  talks to any of these directly — only through IPC (`src/main/ipc`).
- **`src/preload`** — the only bridge between renderer and main, exposed as
  `window.flow` (typed by `FlowApi` in `src/shared/types`). The renderer has
  no Node access and no direct filesystem/OS access — by design, not by
  omission.
- **`src/renderer`** — React + TypeScript + Tailwind UI.
- **`src/shared`** — types and constants imported by both main and renderer,
  so the IPC contract can't silently drift between the two sides.

```
/src
  /main
    /os          OSAdapter interface + platform implementations
    /applications  (Phase 2)
    /keyboard      (Phase 6)
    /workflow    capture policy + event types
    /ai          AIProvider interface + local rule-based implementation
    /hardware    HardwareDevice interface + VirtualHardwareDevice
    /database    SQLite connection + schema
    /ipc         IPC handler registration
  /preload
  /renderer
    /src
      /components
      /pages
      /hooks
      /stores
      /styles
  /shared
    /types
    /constants
```

## Why interfaces exist before their real implementations

Several modules (`OSAdapter`, `HardwareDevice`, `AIProvider`) are defined as
TypeScript interfaces in Phase 1 with only a stub or throwing implementation
behind them. This isn't premature abstraction — brainstorm.md calls for all
three explicitly (sections 4, 9, 13) specifically because the concrete
implementations are expensive or impossible to build correctly right now
(no STM32 hardware yet; no accumulated workflow data yet to design an AI
provider against) but the *shape* of how the rest of the app depends on them
needs to be right from day one. Everything downstream — the workflow engine,
the suggestion engine, the renderer — depends on the interface, never on
`WindowsOSAdapter`, `VirtualHardwareDevice`, or `LocalRuleBasedProvider`
directly.

## Data model

SQLite (via `better-sqlite3`), one file in Electron's `userData` directory.
Schema (`src/main/database/db.ts`): `applications`, `profiles`, `controls`,
`workflow_events`, `suggestions`, `macros`, `modules`, `settings`. The
`workflow_events` table stores only the metadata described in
`docs/privacy-and-legal.md` — application id, event type, modifier-combo
keys or control id, and a timestamp. It has no column capable of holding
free-text content.

## The learning loop (brainstorm.md section 14)

Built as an explicit pipeline, not folded into one function, so each stage
is independently testable and swappable:

```
OBSERVE                  CaptureService (workflow_events, gated by the
                          Enabled/Disabled toggle) + control-activation
                          events from the hardware layer
   ↓
IDENTIFY PATTERN          patternDetection.ts — pure, deterministic,
                          no LLM (repeated shortcuts / sequences / frequent
                          controls)
   ↓
GENERATE SUGGESTION       AIProvider.generateSuggestions() — LocalRuleBasedProvider
                          today; an LLM-backed provider could implement the
                          same interface later without touching anything
                          upstream or downstream of it
   ↓
USER ACCEPTS/REJECTS      suggestionsRepository.resolveSuggestion() — a
                          decision, once made, is permanent: the pattern is
                          never re-suggested (insertSuggestionIfNew no-ops
                          on any existing status)
   ↓
UPDATE USER MODEL          suggestionsRepository.getConfidenceBiasForKind() —
                          a small, deterministic, inspectable accept/reject
                          ratio per pattern kind, bounded to ±0.15
   ↓
IMPROVE FUTURE SUGGESTIONS  fed back into LocalRuleBasedProvider via
                          constructor injection, so the next suggestion of
                          the same kind starts from a nudged base confidence
```

`SuggestionEngine.refresh()` (`src/main/ai/suggestionEngine.ts`) is the one
place that walks OBSERVE → GENERATE SUGGESTION; it's called after every
captured event, and is idempotent by construction (safe to call as often as
useful).

## Real execution

Pressing a virtual control does not just animate — it performs the
control's configured action for real. This section is the design and
safety reasoning for that, since "actually control the computer" is a
meaningfully bigger trust step than anything earlier in the app.

> **Current status: keystroke execution (shortcut/macro) is disabled.**
> Two real-world incidents in a row — Chrome left unable to reopen after a
> configured `Ctrl+W`, then Chrome crashing outright on a plain `Ctrl+R` —
> both happened through the focus-dance + `uIOhook.keyTap` path described
> below. `KEYSTROKE_EXECUTION_ENABLED = false` in `actionExecutor.ts` turns
> it off entirely until that mechanism is redesigned and far more
> thoroughly verified; a shortcut/macro control still logs its press and
> flashes in the UI, it just never reaches `keyTap`. `systemCommand`
> (volume) and `flowAction: 'closeWindow'` are unaffected and still
> execute for real — neither uses the focus dance or `uIOhook` at all. The
> rest of this section describes the design as built; treat the
> shortcut/macro half as currently inert.

**Layering.** `VirtualHardwareDevice.pressControl()` only ever emits a
`buttonPress` DEVICE → HOST event (`{ controlId, slot }`) — it has no idea
what a "shortcut" is, deliberately, because a real STM32 device won't
either; it just reports which button moved. `main/index.ts`'s device-event
listener is what looks up that control's current action (from the active
profile) and calls `actionExecutor.executeControlAction()`. Keeping this
split means the hardware layer stays swappable (item 1 under "Hardware
embedding considerations" below) even now that real side effects exist.

**Closed vocabulary, both directions.** `keyNames.ts` is the single source
of truth for translating between uiohook-napi's raw keycodes and Flow's
canonical key names (`'Control'`, `'S'`, `'F5'`, ...) — the same module
`captureService.ts` uses to *recognize* a keydown is used by
`actionExecutor.ts` to *resolve* a stored name back to a code before
synthesizing it. A name that isn't in the vocabulary resolves to nothing
and execution is refused — Flow only ever sends key combinations that were
already validated at capture or configuration time, never arbitrary
strings. The same posture applies to `systemCommand`: it's typed as a free
string on `ControlAction`, but `systemCommands.ts` only executes an exact
match against a fixed allowlist (currently `volumeMute`/`volumeUp`/
`volumeDown`) — never runs the string itself as a command.

**Refocus, but verify, or refuse.** A shortcut/macro action needs to reach
the *target* application, not whichever window happens to be focused —
which, at the moment of a click, is always Flow's own window (that's what
just received the click). `windowsAdapter.ts` deliberately excludes Flow's
own process from "active application" detection (see the comment there), so
it always remembers the real target window's handle. `windowFocus.ts` then
refocuses that handle using the `AttachThreadInput` pattern (a plain
`SetForegroundWindow` call from a freshly-spawned process is unreliable on
Windows — it isn't the process that received the user's last input, so the
OS is within its rights to ignore the request), and — critically —
re-reads the foreground window afterward to *confirm* the switch actually
happened before anything gets sent. If it can't confirm, execution stops
there. Sending a configured shortcut to the wrong window is worse than not
sending it; this is the same "fail closed, never guess" posture as
`suggestionResolution.ts`'s slot assignment.

**What isn't implemented.** `launchApplication` and every `flowAction`
except `closeWindow` (below) are refused
(`{ ok: false, reason: '... not implemented yet' }`) — there's no stored
executable-path registry yet to launch an app by id, and no other
`flowAction` has been given concrete semantics. Both are explicit, visible
failures, not silent no-ops.

**Window-closing keystrokes are never executed — a real incident, and the
proper fix.** Sending `Ctrl+W` to Chrome's last open tab closed its only
window at almost the same moment the `AttachThreadInput` focus dance above
was touching that window, and afterward Chrome kept running as a
background process but stopped responding to "open a new window" — every
chrome.exe process had to be killed by hand before Chrome would open
again. `actionExecutor.ts`'s `BLOCKED_COMBOS` list (`Alt+F4`, `Ctrl+W`,
`Ctrl+Shift+W`, `Ctrl+Q`, `Ctrl+F4`, checked order-independently) refuses
all of these outright, for both direct shortcuts and macro steps, before
the focus dance is even attempted. This is a blocklist, not a proof of
safety — see the comment at its definition before adding to or relying on
it further.

Blocking the keystroke doesn't mean closing a window has to stay
impossible, though — it means the *keystroke* route is the wrong tool for
it. `flowAction: 'closeWindow'` (`windowClose.ts`) is the safe replacement:
it posts `WM_CLOSE` directly to the target window handle — the exact
message a title bar's X button sends — instead of simulating a keypress.
This is categorically different from the blocked combos above: `WM_CLOSE`
needs no focus at all (it can be posted to any window regardless of what's
currently focused, so none of the `AttachThreadInput` risk applies), and
the target application decides how to respond, including raising an
"unsaved changes" prompt and declining to close — exactly as it would for
a real click on X, and never a forceful termination.

## Hardware embedding considerations (forward-looking)

The physical keyboard doesn't exist yet, but several Phase 1 decisions
exist specifically so integrating it later (Phase 7, Milestone 3) is a
component swap, not a rewrite:

1. **One event path for physical and virtual input.** A future physical
   `BUTTON_PRESS`/`ENCODER_ROTATE` event and a click on the virtual
   keyboard will both resolve to the same internal `ControlActivatedEvent`.
   The workflow engine, suggestion engine, and macro runner depend only on
   that event type — never on `VirtualHardwareDevice` — so they cannot tell
   (and don't need to care) whether a control was triggered by a mouse
   click or a real button.
2. **Small, display-safe control labels.** `Control.label` is a short
   string (~12 characters) plus an optional icon id, because a real
   module's OLED/segment display can only render short labels. Designing
   the data model around a hypothetical rich UI now would mean redesigning
   it later; constraining it now costs nothing.
3. **Protocol/version fields from day one.** `DeviceStatus` carries
   `protocolVersion` (and, once real hardware exists, `firmwareVersion`)
   even though `VirtualHardwareDevice` just reports a static version today.
   Version negotiation and OTA firmware updates are easy to add to a field
   that already exists and much harder to retrofit.
4. **Event-driven, not polled.** Application/control-change detection is
   designed around OS hooks and focus-change events, not polling loops —
   matching the low-latency expectation of a physical button press, and
   avoiding a re-architecture once real serial/USB I/O is in the loop.
5. **Stable module addressing.** The `Module` type carries a stable `id`
   and `position` (brainstorm.md section 10) even though only virtual
   modules exist today — this is exactly the addressing scheme a real
   modular slot/port needs, so the eventual `MODULE_CONNECTED` /
   `MODULE_DISCONNECTED` protocol messages (section 21) map onto existing
   software concepts instead of inventing new ones.
6. **LED/display as first-class device capabilities.** `setLEDState()` and
   `updateDisplay()` are part of `HardwareDevice` from Phase 1 (section 9),
   even though `VirtualHardwareDevice`'s implementation is a no-op today —
   so the state layer that eventually feeds these calls doesn't need new
   plumbing when real hardware calls become meaningful.
7. **Small, serializable config payloads.** Profiles and controls are kept
   as flat, plain JSON — no functions, no class instances, nothing
   non-serializable — because this is the same payload shape that will
   eventually need to travel over a wire (USB/serial) to an STM32 with
   limited RAM and flash. `docs/hardware-protocol.md` (Phase 7) will define
   the wire format; keeping the software-side model simple now means that
   document is a serialization spec, not a data-model redesign.

## What Phase 1 deliberately does not include

Per brainstorm.md's build order: no real application detection (`os/`
interfaces exist, `WindowsOSAdapter` throws), no virtual keyboard UI, no
workflow capture wired to an OS hook, no suggestion generation, no macros.
The dashboard shows real (if currently empty/zero) data from SQLite rather
than any placeholder or fake numbers — see brainstorm.md section 7.
