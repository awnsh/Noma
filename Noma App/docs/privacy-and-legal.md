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
- **Which application is in the foreground, and when it changes, is stored
  too** — `{ applicationId, timestamp }`, an `appSwitch` WorkflowEvent
  logged whenever the real OS-reported foreground process changes (see
  `ApplicationContextService`/`WindowsOSAdapter`, gated by the exact same
  monitoring toggle as everything else here). This isn't new *access* — Flow
  already reads the foreground process continuously to drive "Current
  Application" on the Dashboard — it's a new decision to *persist* a
  timestamped history of it, specifically so pattern detection can
  recognize a workflow that spans multiple applications (screenshot tool ->
  editor -> git client), not only the shortcuts pressed within one. Still
  never a window title, never a URL, never window content — just the same
  `Application` identity (`id`/`name`/`processName`) the contextual-UI
  feature already resolves.

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
- **Cross-app workflow recognition** (`detectCrossAppWorkflows` in
  `src/main/workflow/patternDetection.ts`) reads `appSwitch` rows alongside
  `shortcut` rows from that same table — no new capture surface, no new
  table, just a detector that no longer assumes every pattern lives inside
  one application.
- **WORKFLOW LEARNING** (`detectMultiStepWorkflows`, same file) reads the
  identical `{ applicationId, eventType, comboKeys, timestamp }` rows every
  other detector reads — no new capture surface, no new event type, no
  richer data than what `shouldCaptureKeyCombo` already let through. It
  recognizes a *sequence* by comparing the same command-modifier-gated combo
  strings and application ids the schema already stored; it has no way to
  know, and never stores, what was in a screenshot, what was typed into the
  application switched into, or the contents of a paste. This is the literal
  meaning of "behavioral metadata, not surveillance": Noma can tell you
  *that* you repeated screenshot → switch app → paste, and how many times,
  never *what* was in any of those steps.

## Holo — microphone input (the free, no-hardware option)

Holo (`src/renderer/src/lib/holo`, `pages/Holo.tsx`) lets someone use Noma
without buying the physical keyboard, by tapping the desk around their
laptop instead — a simplified, from-scratch reimplementation of the
*concept* behind the open-source `github.com/JustinGamer191/Holo` project
(MIT-licensed; its actual Swift/macOS code never runs here). This is a
**materially different privacy shape than the keystroke policy above**,
worth stating plainly rather than implying it's covered by the same
reasoning:

- **The keystroke design has a hard content/metadata boundary** —
  `shouldCaptureKeyCombo` structurally cannot see typed characters at all,
  by construction, before anything is even considered for storage.
  **A live microphone has no equivalent boundary.** Classifying "which desk
  zone was tapped" requires analyzing the actual waveform — there is no way
  to compute that without the raw audio passing through memory first,
  including whatever ambient sound (including speech, if someone is talking
  near the laptop) happens to be present at that instant. The privacy
  guarantee here is necessarily about *what happens to that audio after*,
  not about never processing it in the first place.
- **What's actually kept, and for how long:** a rolling in-memory buffer
  (Web Audio API's `AnalyserNode`) that the app reads every ~20ms to check
  loudness, and — only in the brief instant an onset is detected — one
  short window (~20 ms) of every microphone channel, immediately collapsed
  to a small numeric feature vector (band levels, spectral centroid,
  decay, and — with several mics — relative level and arrival delay;
  `extractTapFeatures` in `classifier.ts`) that discards content
  entirely. That derived vector, never the audio itself, is the only thing
  that can be persisted (as part of a calibration profile), and only when
  the user explicitly runs the calibration wizard. **No raw audio buffer,
  recording, or waveform is ever written to disk or sent anywhere** —
  there is no code path in this feature that does either. Browser audio
  processing (echo cancellation, noise suppression, auto gain) is turned
  off so taps aren't filtered away; this changes the audio's quality, not
  where it goes.
- **Keyboard/mouse timing gate.** While Holo is listening or calibrating,
  main installs the OS input hook (shared, reference-counted, with
  workflow capture — `sharedHook.ts`) purely to forward the *timestamp* of
  each key/mouse-button/wheel event (`inputActivityService.ts`). Never
  which key, never a position, never persisted; it lets Holo switch the
  mic track off (silence, not filtering) the instant you type or click and
  back on 300 ms after you stop, so typing sounds are never captured at all. The hook is removed when listening stops.
- **Off by default, explicit action required every time.** `getUserMedia`
  is called only from two explicit user actions on the Holo page —
  clicking "Calibrate" or "Start Listening" — never automatically on app
  launch. Once started, listening continues in the background if Holo is
  the chosen Input Source (so taps work while you're in other apps), and
  stops when Input Source is switched back or listening is stopped. (Auto-starting at app launch is still a deliberate non-feature.)
- **The OS's own mic indicator still applies.** Electron surfaces the
  standard browser mic-permission prompt and Windows' own "microphone in
  use" privacy indicator whenever the stream is actually open — Holo adds
  no separate suppression of that, so the same system-level signal a user
  would get from any other app using their mic still applies here.
- **Inspect and delete.** The Holo page shows exactly what's calibrated
  (per-zone sample counts, not raw numbers meant to be human-legible, but
  nothing hidden) and a "Clear" action erases it immediately; `deleteAllData()`
  (the existing factory-reset action) wipes it along with everything else
  in `settings`, with no separate carve-out.
- **Not yet true acoustic-zone security.** The classifier here is a
  simplified nearest-centroid match on a coarse feature vector (see
  `classifier.ts`'s doc comment), not Holo's own trained model — it's a
  convenience/ergonomics feature, not something to rely on as an access
  control. Don't market it as more precise or more secure than it is.

## On-screen button clicks (opt-in, off by default)

Added 2026-09-19 so Flow can recognize workflows *inside* an app ("Cut, then
Delete" in a video editor) — not only key combos and app switches.

This is a **separate, second opt-in** (Settings -> Workflow Monitoring ->
"Learn from on-screen buttons"), off by default, and it only ever runs while
workflow monitoring itself is on. It is a new class of capture, so its limits
are stated explicitly and enforced in one pure, unit-tested place
(`src/main/workflow/clickTarget.ts`), before anything is stored or logged:

- **What is stored:** for each left-click, only the *target* — either
  `label:<button name>` or `zone:<col>x<row>` — plus the application and a
  timestamp. Raw coordinates and raw control names are used transiently to
  compute the target and are never persisted.
- **Labels** come from Windows UI Automation and are kept only for command
  controls (buttons, menu items, check/radio boxes), and only when the name is
  label-shaped: one to three plain words, no digits, no path/URL/e-mail
  punctuation.
- **Never recorded at all** — not even as a position: text fields, documents,
  text, list/tree/table rows, links, images, combo boxes, title bars. Tabs are
  not treated as labeled commands either (a browser tab is named after its
  page).
- **Zones** (a 16x10 grid laid over the window) are used only where an app
  exposes nothing meaningful at the click point (custom-drawn UIs). A known
  command control whose name failed the label filter records nothing, so the
  zone fallback is not a way around it.
- **Excluded apps:** browsers, chat apps, meeting apps and AI chat apps are
  skipped entirely — their buttons routinely carry people's names or page
  content, which a name filter cannot reliably tell apart from a label.
- **Flow's own window** is never recorded. Right/middle clicks are ignored.
- A click is never recorded together with what was typed, and nothing leaves
  the device.

Limits worth knowing: UI Automation only sees what an app chooses to expose,
so accuracy varies by app; and a captured click chain is *informational* —
Flow cannot replay a click (there is no "click this control" macro step), so
these suggestions name the workflow rather than offering to automate it.

## Disclaimer

This document is engineering reasoning intended to keep the *architecture*
privacy-respecting by construction. It is not a legal opinion. Before
shipping Flow to any user other than its developer — and especially before
any deployment on shared or employer-owned machines, or any feature that
adds screen content, clipboard, or cloud sync — have this reviewed by an
actual attorney familiar with wiretap, computer-monitoring, and state
spyware statutes in the relevant jurisdictions. **Holo's microphone input
raises this document's stakes specifically** — recording or transmitting
audio (which this feature deliberately never does) would implicate wiretap/
eavesdropping statutes far more directly than keystroke metadata does, and
a shared/multi-person room is a meaningfully different situation than a
solo desk (see point 5 above, which applies here too) — get real legal
review before this leaves single-user, single-developer use.
