# Flow

Adaptive computer interface — software brain and development platform for a
future modular keyboard. See `brainstorm.md` for the full product vision and
build order, `docs/architecture.md` for how this codebase is organized, and
`docs/privacy-and-legal.md` for the workflow-capture privacy design.

**Phase 1** (scaffold, database, basic dashboard UI, module architecture),
**Phase 2** (real Windows application detection, the profile system,
contextual controls), and **Phase 3** (Virtual Keyboard page, stateful
hardware simulator, modular slots) are done. See "Where things stand" below.

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
Milestone 1 in full:

- The display strip shows the current application's name, live
- The four control tiles mirror whatever app is focused (switch apps with
  the Flow window still open, or Alt-Tab away and back — the deck updates)
- Click a control tile — it flashes, and the event log line below it shows
  `BUTTON_PRESS · slot N`. This does **not** send a real keystroke to
  Windows; it's the simulated device→host event only (see the comment in
  `src/main/hardware/virtualDevice.ts` for why that boundary is deliberate)
- Use "Add Module" to add a Macro / Rotary Encoder / Slider / Display /
  Numpad / Creator module — it appears as a chip immediately; the × removes
  it. Both fire a real `MODULE_CONNECTED`/`MODULE_DISCONNECTED` device event
  under the hood, the same shape a real module plugging into a physical slot
  will report later

## Test it

```powershell
npm test        # unit tests (currently: the workflow capture-policy filter)
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

Not yet built (by design — see brainstorm.md's build order): workflow event
capture wired to the already-written capture-policy filter, pattern
detection, suggestions, and macros. Virtual control presses are visual/event
simulation only — they deliberately do not send real keystrokes to Windows
(see the comment in `src/main/hardware/virtualDevice.ts`); actually executing
actions is a distinct, more sensitive feature for a later phase.

## Next logical step

Phase 4: workflow event collection — wire `src/main/workflow/captureFilter.ts`
to a real global keyboard hook (Windows `WH_KEYBOARD_LL`), write accepted
combos into `workflow_events`, and build the first pattern-detection pass
(repeated shortcuts/sequences) that Flow Insights and the suggestion engine
will consume later.
