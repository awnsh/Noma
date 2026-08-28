# Reliability Testing — Real Execution Path

A focused pass validating the real-execution mechanism
(`docs/architecture.md`'s "Real execution" section) against real,
disposable windows on a real Windows machine — not just the fail-closed
unit tests in `actionExecutor.test.ts`, which deliberately never touch a
real window. Written up here rather than left as a one-off script because
the *findings* matter beyond this session, even though the script itself
doesn't (see "Methodology" below for why it wasn't kept).

## What this validated, and why it's the highest-value test to run first

The two real incidents that triggered the `windowFocus.ts` redesign
(`docs/architecture.md`) were both about **closing/reloading a window**
(Chrome left unable to reopen after `Ctrl+W`; Chrome crashing on `Ctrl+R`).
Re-validating the *closing* path against real windows — with a real,
repeatable test that specifically checks for the exact prior failure mode,
not just "did it close" — is the most direct way to confirm the redesign
actually fixed what broke, rather than trusting the architectural
reasoning alone.

## Method

A temporary vitest file (`src/main/actions/manualReliability.test.ts`,
deleted after this run — see "Why the script itself wasn't kept") called
the real, unmodified `executeControlAction` against real window handles:

- Spawned a fresh Notepad instance, a fresh disposable Chrome window
  (opened via `--new-window` to a `data:` URL with a unique marker title
  — never the user's real tabs/profile data), and a fresh File Explorer
  window (pointed at a scratch temp folder) — each found by enumerating
  real top-level windows and matching on a title unique to that run, never
  by PID (Chrome and Explorer share one process across multiple windows,
  so a PID-based lookup can't reliably identify "the window this test just
  opened").
- Called `executeControlAction({ type: 'flowAction', action: 'closeWindow' }, hwnd)`
  — the exact function and code path a real control press uses — against
  each, and confirmed the window was actually gone afterward (`IsWindow`
  returns false).
- For Chrome specifically: immediately after closing the disposable
  window, opened one more disposable window and confirmed it actually
  appeared — a direct re-check of the exact historical failure ("Chrome
  left running but unable to open a new window").

## Results

| Target | Action | Result |
|---|---|---|
| Notepad | `flowAction: closeWindow` | ✅ Closed gracefully |
| Chrome (disposable window) | `flowAction: closeWindow` | ✅ Closed gracefully |
| Chrome | Opens a new window immediately after | ✅ Yes — the original failure does not recur |
| File Explorer | `flowAction: closeWindow` | ✅ Closed gracefully |

No failures, no crashes, no leftover broken process state. This is real
signal, not a restatement of the architecture doc's reasoning: the
`koffi`-based direct-call redesign genuinely fixed the specific thing that
broke.

## What this did *not* validate, and why (an honest limitation, not a gap glossed over)

Shortcut-sending (`Control+R`, `Control+T`, ...) goes through
`focusWindowAndVerify`, which calls `SetForegroundWindow`. That call only
succeeds for a process with genuine Windows input-focus standing — in
practice, a process that just received a real click. A bare Node/vitest
script has never received any real input, so it correctly, safely fails
closed (`"Could not confirm focus on the target window — refused to
send"`) rather than guessing. **This is the fail-safe working exactly as
designed** (see `docs/architecture.md`), not a bug — but it also means a
headless script cannot validate the *success* path for shortcut-sending;
only a real click in the real running app has the standing to do that.

I attempted to extend this into a real-click test (genuine `mouse_event`
synthetic input — not a DOM-level `.click()`, which wouldn't count as real
input either) against the actual running app, and hit a concrete, worth
recording obstacle: mapping screen coordinates from `GetWindowRect` to
where a click should land ran into what looks like a DPI-scaling mismatch
between the calling (non-DPI-aware) PowerShell process and the
Electron app's own coordinate space — a blind click landed ambiguously
near an unrelated overlapping window on the real desktop rather than
reliably on the intended control. Rather than push further into fragile
coordinate-guessing on a real, shared desktop (risking an accidental click
on something unrelated), I stopped.

**The correct way to close this gap** is a proper Playwright-Electron
driver using coordinate-based `locator.click()` (real synthetic input,
DPI-aware, not the DOM-`.click()` shortcut some driver examples use) — a
real infrastructure investment, not a quick add-on. Given this pass's
scope is "harden what exists, don't build new things," that harness
wasn't built here. The shortcut-sending path's *outcomes* (does `Ctrl+R`
actually reach Chrome without crashing it) still rest on the informal
verification already described in the README's incident writeup, plus
ordinary use of the app.

## Why the script itself wasn't kept

It's inherently environment-dependent (assumes Notepad/Chrome/Explorer at
fixed paths, spawns real GUI windows, takes ~10-30s per app) and isn't
something CI or a future contributor should run unknowingly — closer to a
manual QA checklist than a unit test. The *methodology and results* above
are the durable artifact; re-run the same approach (spawn a disposable
window, match by a unique title, call `executeControlAction`, verify
`IsWindow`) if this needs re-checking after a future change to
`windowClose.ts`/`windowFocus.ts`/`win32.ts`.

## Recommendation

- No code changes needed from this pass — nothing broke.
- If/when a proper GUI-driving harness is worth building (e.g. ahead of a
  user-testing session), build it as a real Playwright-Electron driver
  per the note above, not more ad hoc PowerShell scripting.
- Before putting the app in front of people, do a quick manual pass of
  the shortcut-sending path in a couple more real apps you actually use
  day to day (this is the one thing a script couldn't cover this round).
