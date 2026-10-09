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

## Glide (formerly Holo) — trackpad swipe-in (the free, no-hardware option)

Glide lets someone use Noma without buying the physical keyboard: slide a
finger from the empty space beside the trackpad onto it, and that side's
control runs (`main/holo/trackpadGesture.ts`). It uses no microphone. (An
earlier version listened for desk taps through the microphone; it was
removed, along with its audio processing, calibration and test-session
recordings. See docs/architecture.md's Holo section.)

- **It reads finger positions on the trackpad.** While it is on, `touchpadReports.ts` parses each precision-touchpad
  report into contacts (position on the pad, touching or not, the pad's own
  palm flag, contact ID) so the gesture can be recognised. They are used in
  memory and dropped on the next report. Only "a swipe-in happened" (which
  side, when) leaves the main process. Nothing is stored, logged or sent.
- **It moves the pointer back.** A swipe-in moves the pointer like any
  finger on the pad; Noma reads where the pointer was when the finger
  arrived and puts it back once the swipe is recognised. It reads the
  pointer position for nothing else.
- **Key timestamps only.** It also hears *that* a key was pressed (never
  which), via the shared keyboard hook, so a hand brushing the pad's edge
  as it comes off the keyboard is ignored.
- **Off until turned on.** The raw-input registration and the key hook exist
  only between the Glide page's "Turn on" and turning it off (or switching
  Input Source back to Keyboard), and are removed then. If it was on when
  Noma last closed and Glide is the chosen Input Source, it comes back on at
  launch.
- **The touch check is the one exception to "nothing is stored".** The
  Glide page's touch check, which the user starts, records under a minute of
  finger positions and key-press times (never which key) while they swipe
  and use the trackpad as instructed, and saves them as a JSON file in
  %APPDATA%/noma/holo-recordings so the swipe-in rules can be tuned on
  their trackpad. Nothing fires while it runs. Only saved on this computer;
  nothing uploads it; the user can delete it from that folder any time.

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
so accuracy varies by app. A captured `zone:` click chain (no named control
at the click point) *can* be turned into a real macro and replayed — see
`docs/architecture.md`'s "Click and cross-app execution" — which replays the
click at the same coarse, window-relative position it was recorded at, never
anything more precise than what was already captured. A `label:` click is
replayed by looking the named control up again with UI Automation in the
app the step was recorded in, at the moment the macro runs
(`main/actions/uiaControlFinder.ts`). That search reads the names of the
app's buttons and menu items to find the one that matches, in memory, and
keeps nothing: no name it sees is stored, logged or sent anywhere, and it
only runs when the user presses a control whose macro contains such a step.

## Screenshot areas (for replaying a screenshot step)

Right after Flow sees a region-screenshot shortcut (Win+Shift+S, or
Cmd+Shift+4 on a Mac), it watches the next mouse drag and keeps only that
drag's rectangle: four numbers (position and size), the last 10 of them, in
the local `settings` table under `screenshotRegions`. Never what was inside
the area, and nothing is captured at that point. When a saved workflow
replays its screenshot step, Noma takes that screenshot itself, of the area
the person usually drags, and puts it on the clipboard (or, for a Mac's
Cmd+Shift+4, in the Mac's own screenshot folder), exactly where the
person's own screenshot would have gone. Noma does not keep, read or send
the image. See main/workflow/screenshotRegions.ts and
main/actions/screenshot.ts.

## Disclaimer

This document is engineering reasoning intended to keep the *architecture*
privacy-respecting by construction. It is not a legal opinion. Before
shipping Flow to any user other than its developer — and especially before
any deployment on shared or employer-owned machines, or any feature that
adds screen content, clipboard, or cloud sync — have this reviewed by an
actual attorney familiar with wiretap, computer-monitoring, and state
spyware statutes in the relevant jurisdictions.

## Beta issue reports (v0.1)

Settings > Report a problem never sends anything by itself. "Open the report
form" opens the website's empty report form (nomashift.com/feedback) in the
tester's browser; nothing is put in the URL. "Show technical details" builds a plain-text summary on
request (`main/diagnostics.ts`) and shows all of it before the tester can
copy it: Noma and Electron versions, OS version, Glide on/off, zone count,
touchpad count and any Glide error, Flow on/off, counts of pending
suggestions, saved workflows and set-up apps, and the time, action kind and
success or failure reason of the last 15 presses. It deliberately leaves out
control and workflow names, shortcuts, app names, typed text and
screenshots. Failure reasons can name a button Noma looked for ("Found 2
buttons named …"), which is why the tester reads it before pasting.

## Glide in v0.1

Glide's on/off switch and zone count are stored in the local `settings`
table and the main process reads the touchpad only while Glide is on (or
during a touch check the user starts). The recorded touch-check fixture in
`src/main/holo/fixtures/` holds finger positions from the developer's own
laptop and no key presses.
