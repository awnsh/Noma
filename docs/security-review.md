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

## 4. Database

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

## 5. Dependencies

Two native dependencies (`better-sqlite3`, `uiohook-napi`) are used
specifically because they ship N-API prebuilt binaries — no source
compilation happens on install, which also means no arbitrary build-script
execution from a compromised package at install time beyond what npm's
normal install already trusts. Both are widely used, actively maintained
packages. No LLM/cloud AI dependency exists yet — `AIProvider` is local
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
