# Noma Virtual Device

A standalone native window that is *only* the eventual physical module: a
narrow vertical OLED screen and 4 key-sized buttons stacked underneath it
(matching Noma Website's `KeyboardVisual.tsx` — the real module is a
narrow vertical strip beside the arrow keys, not a wide tile grid).
Nothing else — no dashboard, no settings, no keyboard alpha block. It
exists to test that exact surface, and Flow's logic behind it, before any
hardware exists.

This is not a mockup and not the pitch/user-testing `Noma Software
Prototype` (which deliberately fakes execution). Every button press here
runs through the real, running `Noma App` — the same
`VirtualHardwareDevice` → `actionExecutor.ts` path a press on Noma App's
own in-app Virtual Keyboard page uses. If a shortcut fires wrong, a
suggestion misbehaves, or Flow gets confused, that's a real product bug,
surfaced here as directly as it would be from a real button.

## How it works

This app has no business logic of its own — it's a dumb terminal, exactly
what a real firmware module would be. It connects to `Noma App`'s local
device transport (`src/main/hardware/deviceTransportServer.ts` in the
`Noma App` project, a loopback-only WebSocket) and speaks the exact
HOST↔DEVICE message vocabulary documented in `Noma App/docs/hardware-protocol.md`:

- Renders whatever `DEVICE_STATUS` says (the current app name, and up to
  4 controls) — nothing here decides what a control does or looks like.
- A button click sends `BUTTON_PRESS` and nothing more. Noma App decides
  what that means and actually executes it.

**Opening this app is, to Noma App, indistinguishable from plugging in a
real keyboard**: Noma App reports its hardware as disconnected until this
app attaches, and disconnected again the moment it closes. If it can't
connect (Noma App isn't running yet), the screen shows "Noma not running —
waiting…" and retries automatically every 2 seconds.

The window itself floats always-on-top and never takes OS keyboard focus
(`focusable: false`) — like a physical button box sitting next to your
keyboard, not a normal app you alt-tab to. This isn't just UX polish: if
this window *could* become the foreground window, clicking a button would
make Noma App's own active-window detection see "Noma Virtual Device" as
the current application instead of whatever real app (VS Code, Premiere,
…) the press is actually meant to act on — the exact thing this tool
exists to test correctly. So it stays visible and clickable over any
other window/program, while that other window stays the real target the
whole time.

There's no native OS title bar (a `focusable: false` window's caption
buttons don't reliably respond, since they're designed around the window
becoming active on click — this one deliberately never does). Instead:
drag the "noma" bar at the top to move the window anywhere on screen, and
use the **✕** button in its corner to close the app.

## Run it

1. Start `Noma App` first (`npm run dev` in the `Noma App` project) — this
   app has nothing to talk to otherwise.
2. `npm install`
3. `npm start`

## Deliberately not here

No shortcut vocabulary, no suggestion engine, no persistence, no build
step (plain Electron + vanilla JS/CSS — this UI is a screen and 4
buttons, a bundler would be overhead). If the port ever changes on the
`Noma App` side (`DEVICE_TRANSPORT_PORT` in
`Noma App/src/shared/constants/index.ts`), update the hardcoded copy in
`renderer/app.js` to match — there's no shared package between the two
projects.
