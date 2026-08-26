# Privacy & Legal Design — Flow Workflow Capture

This document explains a specific, load-bearing design decision: how Flow
observes workflow behavior without becoming — legally, technically, or in
spirit — a keylogger. It is engineering risk-reduction reasoning, written by
an engineer, not legal advice. See the disclaimer at the end.

## Why this matters

Flow's core value proposition (brainstorm.md sections 1, 11-14) depends on
observing what the user does — which shortcuts they use, how often, in what
sequence — well enough to suggest useful automation. That is precisely the
category of behavior that keylogger, spyware, and wiretap-style laws exist
to prevent when done covertly or over other people's communications. Getting
this wrong isn't just a legal risk; it's the thing that would make Flow
untrustworthy as a product. Section 2 of brainstorm.md ("Critical Privacy
Principle") is the constraint this document exists to satisfy.

## The core design decision: metadata-only, modifier-gated capture

- A single key press is **never** captured. Individual characters are where
  typed content lives.
- A **Shift-only** combination is never captured. Shift is how capital
  letters and symbols are typed — content, not commands.
- A combination is captured **only** if it includes at least one of
  **Control, Alt, or Meta (the Windows key)** held together with at least
  one other key. This is the class of input that represents an application
  *command* — `Ctrl+S`, `Ctrl+Shift+P`, `Alt+Tab`, `Win+D` — never typed
  text. Shift may still be present alongside one of these three (e.g.
  `Ctrl+Shift+P`, VS Code's command palette, is a real shortcut and is
  captured).
- The filter (`shouldCaptureKeyCombo` in
  `src/main/workflow/captureFilter.ts`) is a pure, synchronous function
  designed to run *inside* the OS-level hook callback itself (Phase 4),
  before a rejected key event is ever assembled into an object, buffered,
  logged, or handed to any other part of the app. Rejection happens at the
  point of capture, not as a filter applied afterward to something already
  recorded.
- What gets stored, when a combo is accepted, is exactly:
  `{ applicationId, comboKeys: ['Control', 'Shift', 'P'], timestamp }` —
  never which character was typed, never window content, never clipboard,
  never a screenshot.

## Why this holds up (general reasoning, not legal advice)

1. **Self-monitoring on a device the user owns.** Statutes like the U.S.
   federal Wiretap Act/ECPA and the Computer Fraud and Abuse Act, and their
   state analogs, are principally aimed at unauthorized interception of
   *another* person's communications or unauthorized access to *another*
   person's computer. Flow is single-user and runs only on a machine the
   user owns and controls, observing only that user's own interaction with
   their own applications.
2. **No "contents" interception.** Wiretap-style statutes and most state
   equivalents distinguish the *contents* of a communication (the substance
   — what was typed or said) from *metadata* (facts about the
   communication — that a command was issued, and how often). By
   construction, Flow never captures contents: no characters, no text
   fields, no clipboard, no screenshots without a future, explicit,
   separately-scoped opt-in.
3. **Local-only, no covert transmission.** Nothing leaves the device unless
   the user explicitly enables a future integration (e.g. an LLM
   `AIProvider`), and even then only sanitized, aggregated metadata is
   sent — never raw combos correlated with window content. This avoids the
   "secret exfiltration" pattern that anti-spyware statutes, most state
   spyware laws, and FTC Section 5 unfair-practices actions against covert
   monitoring vendors have historically targeted.
4. **Explicit consent, visible state, per-feature toggle.** Every
   workflow-monitoring capability ships **disabled by default**, requires
   explicit opt-in, and is independently toggleable (brainstorm.md section
   2). While active, its state is visible to the user (Developer Mode's
   event log, section 20, doubles as a live audit trail). Transparency is
   what defeats the "secret/covert" element central to keylogger and
   spyware liability theories — Flow is designed to be inspectable, not
   opaque.

   As of Phase 4 this is a real implementation guarantee, not just a UI
   toggle over data Flow ignores: when monitoring is off (the default),
   the OS-level keyboard hook is **not installed at all**. `CaptureService`
   only calls into the hook library when the user turns monitoring on, and
   releases the hook the moment they turn it off (`src/main/workflow/
   captureService.ts`). There is no code path where Flow observes
   keystrokes system-wide without that toggle being on.
5. **Shared or work machines are a different case.** If Flow is ever run on
   a machine shared with, or owned by, someone else, the modifier-gated
   policy still only ever reveals command *frequency* (e.g. "Ctrl+Shift+P
   used 47 times") — never what was typed — which meaningfully narrows
   exposure versus a true keylogger, but does not eliminate the need for
   the other party's consent in two-party-consent jurisdictions or under
   an employer's monitoring policy. This scenario is out of scope for the
   current single-user MVP; revisit before any multi-user or
   employer-deployed use case.
6. **Right to inspect and delete.** Developer Mode is a transparency tool,
   not just a debug tool — the user can see exactly what has been logged.
   A "clear all workflow data" action should exist from the point this data
   starts accumulating (Phase 4), not be deferred to later polish.

## Implementation status

- `shouldCaptureKeyCombo(keys: string[]): boolean` — the policy, decided and
  unit tested in Phase 1 (`src/main/workflow/captureFilter.ts`,
  `captureFilter.test.ts`) before any hook existed to call it.
- **Phase 4: the hook is real.** `CaptureService`
  (`src/main/workflow/captureService.ts`) uses `uiohook-napi` for the actual
  global low-level keyboard hook. Its `comboFromKeydownEvent()` function —
  unit tested independently of the native hook itself
  (`captureService.test.ts`) — is the enforcement point: it only ever fires
  on the non-modifier "trigger" key of a chord (never a bare modifier
  keydown), builds the combo from that event's own modifier flags, and
  hands it to `shouldCaptureKeyCombo` before anything is stored. A rejected
  combo never reaches the database.
- The hook is started/stopped by the Enabled/Disabled toggle on the
  Dashboard (`Workflow Monitoring` panel), backed by a `settings` row —
  **off by default** on first run and after every fresh install.
- Captured combos are stored as `{ applicationId, comboKeys, timestamp }` in
  `workflow_events`, tagged with whichever application was active at the
  moment of capture (from Phase 2's `ApplicationContextService`) — exactly
  the shape described above, nothing more.

## Disclaimer

This document is engineering reasoning intended to keep the *architecture*
privacy-respecting by construction. It is not a legal opinion. Before
shipping Flow to any user other than its developer — and especially before
any deployment on shared or employer-owned machines, or any feature that
adds screen content, clipboard, or cloud sync — have this reviewed by an
actual attorney familiar with wiretap, computer-monitoring, and state
spyware statutes in the relevant jurisdictions.
