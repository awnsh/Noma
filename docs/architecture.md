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
