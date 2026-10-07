# Releasing Noma (Windows + macOS)

Noma is one codebase. Every change you make lands on both platforms; the
OS-specific parts live behind `src/main/platform.ts` (Windows: `win32.ts`,
`windowsAdapter.ts`, the PowerShell UI Automation helpers; macOS: `macos.ts`,
`macAdapter.ts`).

## Shipping an update

```bash
npm run release            # 0.1.0 -> 0.1.1   (or: npm run release -- minor)
```

First add the new version's notes to `src/shared/releaseNotes.ts` and commit
them: installed copies show them once after updating ("What's new"), and the
script refuses to tag a version that has none.

Then push, with GitHub Desktop's **Push origin** or `git push --follow-tags`.

Pushing the `vX.Y.Z` tag starts **Noma App release** in GitHub Actions:

1. Typecheck and tests (Windows).
2. A GitHub release named after the tag.
3. The Windows installer and the macOS builds (Apple silicon and Intel),
   uploaded to that release.

4. Copies of the three installers under stable names (`Noma-Setup.exe`,
   `Noma-arm64.dmg`, `Noma-x64.dmg`), added by **Noma App release aliases**
   right after. The website's download buttons link to
   `releases/latest/download/<those names>`, so the site hands out the new
   version as soon as the release finishes: no website edit or redeploy.

Installed copies check that release every 4 hours and at launch:

- **Windows** downloads in the background and installs when Noma quits, or
  right away from the tray menu ("Restart to update to …").
- **macOS** updates itself the same way **only if the build is signed with an
  Apple Developer ID** (below). Unsigned, it shows a notification that opens
  the download page instead, because macOS won't let an unsigned app replace
  itself.

Every push to `main` that touches `Noma App/` also runs **Noma App CI** on
Windows and macOS (typecheck, tests, build, package), so a change that breaks
one platform shows up before you release it.

## What to send pilot users

The latest release page: https://github.com/awnsh/Noma/releases/latest

- **Windows:** `Noma-Setup-X.Y.Z.exe`. The installer isn't code-signed yet,
  so SmartScreen says "Windows protected your PC": **More info → Run anyway**.
- **Mac with Apple silicon (M1 and later):** `Noma-X.Y.Z-arm64.dmg`
- **Intel Mac:** `Noma-X.Y.Z-x64.dmg`

### macOS first launch (unsigned builds)

1. Drag Noma to Applications and open it. macOS refuses the first time.
2. **System Settings → Privacy & Security**, scroll down, **Open Anyway**.
   (If macOS says the app is "damaged", run this once in Terminal:
   `xattr -dr com.apple.quarantine /Applications/Noma.app`.)
3. When Noma asks, allow **Accessibility** (and **Input Monitoring** if
   asked), then quit and reopen Noma. Detecting the app you're in works
   without it; seeing and sending shortcuts, clicks and focusing windows
   don't.

With an unsigned build, macOS forgets the Accessibility permission each time
a new version is installed, so step 3 repeats after every update. Signing
fixes that too.

## Signing the Mac build (recommended before a wider beta)

Needs an Apple Developer Program membership ($99/year). Then add these
repository secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | What it is |
| --- | --- |
| `MAC_CERTIFICATE_P12_BASE64` | Your "Developer ID Application" certificate exported as .p12, base64-encoded (`base64 -i cert.p12 \| pbcopy`) |
| `MAC_CERTIFICATE_PASSWORD` | The password you set when exporting the .p12 |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Your 10-character team ID |

The release workflow detects them: the next release is signed and notarized,
opens without any warnings, keeps its permissions across updates, and
updates itself like the Windows build. No code change is needed.

## Building locally

```bash
npm run dist:win     # on Windows -> dist/Noma-Setup-X.Y.Z.exe
npm run dist:mac     # on a Mac   -> dist/Noma-X.Y.Z-arm64.dmg / -x64.dmg
```

## Platform notes

| | Windows | macOS |
| --- | --- | --- |
| Active app detection | PowerShell poller (Win32) | JavaScript for Automation poller (NSWorkspace), no permission needed |
| Shortcut capture / sending | uiohook | uiohook, needs Accessibility |
| Focus / close a window | SetForegroundWindow / WM_CLOSE | AXFrontmost / the window's close button |
| Named click capture and replay | UI Automation | Accessibility API |
| Volume controls | media virtual keys | AppleScript volume commands |
| Glide (trackpad swipe-ins) | raw HID precision-touchpad reports | MultitouchSupport (built-in trackpad, Magic Trackpad) |

## First run on a real Mac (before sending the Mac build out)

CI's Mac runner typechecks, tests, packages and **launches** the app
(`src/main/smokeTest.ts`: the window renders, the app watcher answers, the
native calls and Glide's trackpad reader load without crashing). What it
can't do is use a trackpad or grant Accessibility, so those still need a
person. Go through this once on a Mac (ideally both an Apple
silicon one and an Intel one):

- [ ] Noma opens and the tray (menu bar) icon appears.
- [ ] Switching between Chrome, VS Code and Spotify changes the current app
      and its controls.
- [ ] With Accessibility allowed: a control's shortcut (e.g. Chrome's NEW TAB,
      ⌘T) runs in the app you're in.
- [ ] Chrome's CLOSE WINDOW control closes the window.
- [ ] Spotify's MUTE control toggles the Mac's sound.
- [ ] Workflow monitoring on: ⌘-shortcuts show up in Activity.
- [ ] Click capture on: clicking a named button in an app records its name.
      A learned workflow with that click replays it.
- [ ] Glide: turn it on (Glide page). It says "On, watching your trackpad".
      Rest a fingertip on the palm rest beside the trackpad and flick it on:
      the activity list shows the zone, and in Chrome the zone's action runs.
      The pointer jumps back to where it was. Ordinary pointing, scrolling
      and typing never fire it. If it misfires or never fires, run the touch
      check and keep the file it saves (thresholds are from a Windows pad).
