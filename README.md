# Noma

Noma learns how you use your computer and turns repetitive workflows into
one-press actions. The desktop app watches for patterns you opt into
sharing (which shortcuts you use, how often, in what sequence — never what
you type), explains what it noticed in plain language, and asks before it
automates anything. A physical device is being built to make that
intelligence tangible — not as a customizable control-center product in its
own right (that space now has direct competition — Logitech's MX Keypad —
see "Current stage" below), but as a physical readout of what the software
already understands.

This repo holds every piece of that: the working desktop prototype, the
public site, and the hardware track (software simulator, a real serial
transport, and starter firmware for a physical device).

## Repo layout

| Folder | What it is | Status |
|---|---|---|
| [`Noma App`](./Noma%20App) | The real product — Electron desktop app: application detection, workflow capture, pattern detection, the suggestion/learning loop, macros, profiles, a virtual hardware simulator, and the Dashboard/Virtual Keyboard/Macro Studio/Learning Center UI. | Working, tested (see below). Start here. |
| [`Noma Website`](./Noma%20Website) | Public marketing site (React/Vite/Tailwind), independent codebase, no shared dependency on `Noma App`. | Live-buildable; copy still reflects the pre-competitive-pivot "adaptive keyboard" story — see its own README's "Before shipping" and the note under "Current stage" below. |
| [`Noma Virtual Device`](./Noma%20Virtual%20Device) | A standalone always-on-top window that *is* the eventual physical module (OLED + 4 buttons) — a real, dumb terminal client of `Noma App`'s hardware transport, for testing Flow's behavior before any physical hardware exists. | Working. |
| [`Noma Device Firmware`](./Noma%20Device%20Firmware) | An ESP32 sketch implementing the real HOST↔DEVICE serial protocol, plus a parts list and wiring guide, for the first actual physical prototype. | Written against the documented protocol; not yet flashed or verified against real hardware — no board has existed in this repo's history. |
| [`Noma Software Prototype`](./Noma%20Software%20Prototype) | A separate, deliberately-fake pre-hardware pitch/user-testing build (no real execution) used to validate the concept with 20-30 outside people before investing in hardware. | Standalone; not connected to `Noma App`. |

No package is shared between these projects — where something needs to
match across two of them (a color token, a protocol constant, a port
number, a logo asset), it's copied by hand and called out in a comment at
the point of use. Grep for the specific constant if you're changing one of
these and aren't sure what else depends on it.

## Current stage

The software loop (application detection → workflow capture → pattern
detection → suggestion → accept/reject → learning) is real and working end
to end in `Noma App` — not mocked, not a placeholder. See its own
`README.md` for a guided walkthrough and `docs/architecture.md` for how it
fits together.

The project is now moving into a **physical prototype stage**, prompted by
a competing product (Logitech's MX Keypad) that covers the same ground as
Noma's original "keyboard with a screen" framing. The response isn't to
compete feature-for-feature on physical controls — it's to prove the
hardware is a readout of the software's own judgment (a display and
buttons that change because Flow noticed something, not because a user
configured a profile). See `Noma App/docs/product-audit.md`'s "Physical
Prototype Stage" update and `Noma App/docs/hardware-protocol.md`'s status
section for the technical detail behind where the hardware track stands
today: a real serial transport (`SerialHardwareDevice`) and starter
firmware exist and are written directly against the same protocol
`VirtualHardwareDevice` already implements, but neither is flashed onto or
wired up against real hardware yet — that's the next concrete step, not
more code.

`Noma Website`'s copy has not yet been updated for this — it still tells
the original "adaptive keyboard" story. Sequencing that rewrite behind
proving the physical prototype out is deliberate, not an oversight.

## Getting started

```powershell
# The main app
cd "Noma App"
npm install
npm run dev      # opens the Electron dashboard
npm test         # 283 tests as of this writing
npm run typecheck

# The marketing site
cd "Noma Website"
npm install
npm run dev

# The hardware test rig (run Noma App first — it has nothing to talk to otherwise)
cd "Noma Virtual Device"
npm install
npm start

# The pre-hardware validation build (standalone, no dependency on the above)
cd "Noma Software Prototype"
npm install
npm run dev
```

`Noma Device Firmware` isn't an npm project — it's an Arduino sketch. See
its own `README.md` for the parts list, wiring, and bring-up order.

## Where to read next

- `Noma App/brainstorm.md` — the original product vision and build order.
- `Noma App/docs/architecture.md` — process layout, the learning loop, and
  the "real execution" safety design (closed key vocabulary, refocus-then-
  verify, the incident history behind it).
- `Noma App/docs/privacy-and-legal.md` — exactly what Flow captures and why
  it isn't a keylogger; the constraint any future capture broadening has to
  keep satisfying.
- `Noma App/docs/hardware-protocol.md` — the HOST↔DEVICE message protocol,
  what's implemented today, and what's still just a design.
- `Noma App/docs/product-audit.md` — the running ground-truth audit: what's
  strong, what's missing, what's next, updated in place rather than
  rewritten each pass.

Assorted PNGs at the repo root are ad-hoc design-review screenshots from
past sessions, not build artifacts — safe to ignore or clean up.
