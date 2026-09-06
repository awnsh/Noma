# Noma Software Prototype

A pre-hardware validation build. This is not the real Noma App (`../Noma App`)
and it doesn't send real keystrokes — it exists to answer one question before
any hardware investment happens: **do people actually want a physical
interface that adapts to what they're doing?**

Put it in front of 20–30 people, watch what they do, read `Ctrl+Shift+V`
afterward.

## Run it

```
npm install
npm run dev
```

Open the printed `localhost` URL. `npm run build && npm run preview` for a
production build.

## What's here

- **Workspace** — the hero, and the whole pitch, live from the moment the
  page loads. Switch between VS Code, Premiere Pro, Chrome, Spotify,
  Discord, and Word; the hardware simulation's adaptive keys change, with a
  smooth "Switching context… / Adapting controls…" beat rather than an
  instant swap. Keep reaching for the same cluster of controls inside an
  app (e.g. Debug + Run in VS Code) and Noma names the specific activity
  it recognizes — "Pattern recognized — Debugging in VS Code" — and lights
  up the relevant keys, live, with nothing to accept or dismiss. Keep
  trading the same two apps back and forth and it recognizes that as a
  workflow instead. Both are logged for Validation Mode.
- **Compare** — the normal-keyboard-vs-Noma pitch, ~15 seconds to read.
- **Your Noma** (Customize) — reorder/pin/remove/restore controls per app.
  Deliberately not the primary flow; Noma's own defaults are.
- **Why Noma** — the concise "not a keyboard with a screen" explanation.
- **Feedback** — the four questions this whole prototype exists to answer.
- **Validation Mode** — hidden. `Ctrl+Shift+V` anywhere, or the small dot at
  the bottom of any in-app screen. Reads sessions/events/survey responses
  straight from `localStorage`, so it aggregates across everyone who's used
  the prototype on this machine, not just the current tab. Has a "Clear all
  data" button for resetting between test cohorts.

## What resets vs. what persists

Reloading the page is the intended way to hand this to the next test
participant: the current app selection, recent-press history (what feeds
pattern recognition), and customization are in-memory only and reset on
reload. Session/event/survey history (what Validation Mode reads) lives in
`localStorage` and survives reloads — that's deliberate, so results
accumulate across a whole day of testing on one machine.

## Deliberately not built

No firmware, no USB/Bluetooth, no real keystroke execution, no accounts, no
real LLM. See the brief this was built from — the point is testing the
concept, not the hardware.
