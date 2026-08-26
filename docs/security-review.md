# Security Review

A focused self-review of Flow's attack surface, written by the engineer
building it. This is engineering diligence, not a professional penetration
test or audit — see the disclaimer at the end. It complements
`docs/privacy-and-legal.md`, which covers the *policy* reasoning for why
workflow capture isn't a keylogger; this document covers the *implementation*
security of the app as a whole.

## 1. Never single keys, never password-like typing

This is the guarantee people care about most, so it's stated precisely and
backed by tests, not just described:

- The capture pipeline only ever calls `shouldCaptureKeyCombo()`
  (`src/main/workflow/captureFilter.ts`) with a key list built from a single
  keydown event's own modifier flags (`ctrlKey`/`altKey`/`metaKey`/
  `shiftKey`) plus the one key that was just pressed — see
  `comboFromKeydownEvent()` in `captureService.ts`.
- That function requires **at least 2 keys held**, **at least one of which
  is Control, Alt, or the Windows key**. Shift alone does not qualify.
- A password typed normally — even a complex one with capital letters and
  symbols — never holds Control, Alt, or Meta. Every keystroke of it
  produces either a 1-key combo (rejected: length < 2) or a Shift+key combo
  (rejected: no Control/Alt/Meta present). **No password, PIN, or any
  normally-typed text ever reaches the point where a combo is even
  constructed, let alone stored.**
- This isn't just described in prose — `captureFilter.test.ts` and
  `captureService.test.ts` assert it directly, including a case for
  Shift+letter (typing a capital) and Shift+digit (typing a symbol).
- The hook only ever registers a `keydown` listener. It never registers
  for `mousemove`, `click`, or `wheel`, even though the underlying library
  (`uiohook-napi`) supports all of them — see `captureService.ts`.

## 2. What's captured, concretely

Only ever `{ applicationId, comboKeys: string[], timestamp }` for shortcuts,
and `{ applicationId, controlId, timestamp }` for a Flow control press. The
`workflow_events` table has no column that could hold free text, a
screenshot, or clipboard content — see the schema in
`src/main/database/db.ts`. Nothing is captured at all unless the user has
explicitly turned on Workflow Monitoring (off by default) — when off, the
OS-level hook is not installed, not merely ignored. Full reasoning in
`docs/privacy-and-legal.md`.

## 3. Electron process hardening

`src/main/index.ts`'s `BrowserWindow` sets these explicitly, rather than
relying on Electron's current defaults happening to be safe:

- `contextIsolation: true` — the renderer's JS world and the preload
  script's JS world are separate; a compromised renderer can't reach into
  preload internals beyond what's explicitly exposed.
- `nodeIntegration: false` — the renderer has no `require`, no `fs`, no
  Node globals at all.
- `sandbox: true` — Chromium's OS-level renderer sandbox is enabled.
- The preload (`src/preload/index.ts`) exposes exactly one object,
  `window.flow`, via `contextBridge.exposeInMainWorld` — a fixed set of
  named methods (see `FlowApi` in `src/shared/types`), each mapping to
  exactly one IPC channel. There is no generic
  `ipcRenderer.invoke(anyChannel)` passthrough exposed to the renderer, so
  a compromised renderer can't invoke arbitrary main-process IPC handlers
  by channel name.
- `setWindowOpenHandler` denies all `window.open`/target=_blank navigation
  from renderer content and routes external links through
  `shell.openExternal` instead — a renderer can't spawn a new,
  unrestricted `BrowserWindow` of its own.
- Only local, bundled content is ever loaded (`ELECTRON_RENDERER_URL` in
  dev, `renderer/index.html` from disk in production) — no remote origin
  is ever navigated to.
- `renderer/index.html` sets a restrictive CSP
  (`default-src 'self'; script-src 'self'`), so even a successful content
  injection can't pull in an external script.

## 4. Real action execution — a new surface, reviewed on its own terms

As of the "functional digital twin" work, pressing a virtual control can
send real synthetic input. This is a materially different risk category
from everything above — it's not passive observation, it's the app acting
on the computer — so it gets its own explicit review rather than folding
into "capture."

**Update: keystroke execution is enabled again, following a redesign.**
Two real crashes in a row (Chrome left unable to reopen; Chrome crashing
on a plain reload), both through an `AttachThreadInput`-based focus dance
run inside a freshly-spawned PowerShell child process, were enough to turn
keystroke execution off outright while the mechanism was rebuilt rather
than patch individual symptoms. `windowFocus.ts` no longer spawns a
process or uses `AttachThreadInput` at all — it calls `SetForegroundWindow`
directly from Flow's own process via `koffi` (an FFI library with
prebuilt binaries), synchronously, in the same tick as the click that
triggered it. That matters for the same reason `AttachThreadInput` was
needed in the first place: Windows restricts `SetForegroundWindow` to a
process that itself recently received user input, which a freshly-spawned
child never had and Flow's own main process always does at the moment of
a click. Removing the need for the workaround removes the failure mode it
was implicated in — see `docs/architecture.md`'s "Real execution" section
for the full account. `KEYSTROKE_EXECUTION_ENABLED` in `actionExecutor.ts`
remains a single kill switch.

`windowClose.ts` (WM_CLOSE) and `systemCommands.ts` (volume) were migrated
to the same `koffi`-based direct calls for consistency — neither ever used
`AttachThreadInput`, but both previously spawned a PowerShell child per
call; now neither spawns anything at all.

- **Closed vocabulary, both directions.** Every key name Flow can *send* is
  drawn from the exact same table it uses to *recognize* incoming keys
  (`keyNames.ts`) — a name outside that vocabulary resolves to nothing and
  execution is refused (`resolveShortcutParts` returns `null`; see
  `actionExecutor.test.ts`). There is no code path that sends arbitrary
  typed text, ever — only pre-configured combos that were themselves
  validated (either captured under the modifier-gated policy, or entered as
  a Control's configuration).
- **`systemCommand` is an allowlist, not a shell.** The field is typed as a
  free string on `ControlAction`, but `systemCommands.ts` only executes an
  *exact match* against three hardcoded volume commands
  (`isKnownSystemCommand`) — the string is never passed to a shell or
  interpreted as a command name. Anything else is refused, tested directly
  in `systemCommands.test.ts`.
- **No process execution at all, arbitrary or otherwise.** The execution
  path (`windowFocus.ts`, `windowClose.ts`, `systemCommands.ts`) no longer
  spawns any child process — every Win32 call goes through `koffi`
  (`win32.ts`) directly from Flow's own process. There's nothing here that
  could be described as a command string, shell syntax, or injectable
  argument: every FFI call takes typed numeric arguments (a window handle,
  a message code, a virtual-key code), never a string built from stored or
  suggested data.
- **Fails closed on window targeting.** A shortcut/macro is refused outright
  if Flow can't *confirm* the intended window actually became focused (see
  `docs/architecture.md`'s "Real execution" section) — the alternative,
  sending it to whatever's focused and hoping, was rejected specifically
  because a misdirected keystroke is worse than a missed one.
- **Window-closing shortcuts are blocked outright — learned the hard way.**
  Early in this feature, sending `Ctrl+W` to Chrome's last tab closed its
  only window and left Chrome running as an unresponsive background
  process — every `chrome.exe` had to be killed by hand before it would
  open again. `Alt+F4`/`Ctrl+W`/`Ctrl+Shift+W`/`Ctrl+Q`/`Ctrl+F4` are now
  refused before anything is sent, for both direct shortcuts and macro
  steps (`isBlockedShortcut` in `actionExecutor.ts`, tested directly). This
  is a fixed blocklist, not a general "is this combo dangerous" classifier
  — treat it as a specific fix for a specific class of failure, not a
  guarantee that every risky combo is covered.
- **Closing is still possible, but only via a graceful path.**
  `flowAction: 'closeWindow'` (`windowClose.ts`) posts `WM_CLOSE` — the
  same message a title bar's X sends — directly to the target window
  handle. No keystroke, no focus-stealing (`WM_CLOSE` can target any
  window regardless of what's focused), and never a forceful process
  termination; the target app decides how to respond, same as a real
  click. This exists specifically because the *keystroke* route to closing
  a window was the risky part, not the concept of closing one.
- **What this doesn't defend against:** a control's action is only ever as
  trustworthy as how it was configured. Today that's exclusively via seed
  data or accepting a suggestion generated from the user's own captured
  behavior — there's no remote or multi-user path that could inject an
  action into a profile. That constraint matters and should be re-checked
  if a shared-profile or cloud-sync feature is ever added.

## 5. Database

- All queries go through `better-sqlite3`'s parameterized `.prepare(...).run(params)` /
  `.get(params)` / `.all(params)` — no raw string concatenation of
  user/application data into SQL anywhere in the repositories. The one
  `LIKE` query with a dynamic prefix (`getConfidenceBiasForKind` in
  `suggestionsRepository.ts`) escapes `%`/`_`/`\` in the prefix before
  binding it as a parameter.
- The SQLite file (`flow.db` in Electron's `userData` directory) is **not
  encrypted at rest**. Given the data model is metadata-only by design (see
  above), this is a deliberate, documented trade-off for the MVP rather
  than an oversight — full-disk encryption or an OS-level credential store
  would matter far more if a future feature ever stored actual content
  (e.g. clipboard, screenshots). Revisit before any such feature ships.

## 6. Dependencies

Three native dependencies (`better-sqlite3`, `uiohook-napi`, `koffi`) are
used specifically because they ship N-API prebuilt binaries — no source
compilation happens on install, which also means no arbitrary build-script
execution from a compromised package at install time beyond what npm's
normal install already trusts. `koffi` is an FFI library — meaningfully
more powerful than the other two in the abstract (it can call arbitrary
native functions by declared signature) — but every call site in this
codebase is a fixed, hardcoded function declaration in `win32.ts`; nothing
in the app constructs a koffi signature or library path from stored,
suggested, or otherwise dynamic data. All three are widely used, actively
maintained packages. No LLM/cloud AI dependency exists yet — `AIProvider` is local
rule-based only (`src/main/ai/localProvider.ts`); when an LLM provider is
eventually added behind that interface, `docs/privacy-and-legal.md`'s rule
(sanitized metadata only, opt-in, never raw keystrokes) governs what it may
ever receive.

## What this review does not cover

- No formal threat model beyond "a user runs this on their own Windows
  machine, alone."
- No fuzzing, no static analysis tooling run, no dependency CVE scan
  (`npm audit` returned 0 known vulnerabilities in current dependencies as
  of this review, but that's a point-in-time check worth re-running
  periodically, not a substitute for one).
- Multi-user / shared-machine deployment, and any future cloud sync, both
  need their own review before shipping — noted already in
  `docs/privacy-and-legal.md`.

## Disclaimer

This is a self-review by the person building the software, intended to
keep security properties honest and verifiable (via the tests referenced
above) rather than asserted. It is not a substitute for a professional
security audit, especially before distributing this to anyone other than
its developer.
