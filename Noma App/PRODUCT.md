# Product

<!-- impeccable:product-schema 1 -->

## Platform

web
<!-- Electron desktop app: a Chromium renderer, so web design conventions
     apply, not a native platform HIG. -->

## What Noma is (v0.1)

Noma gives every app four actions you run by sliding a finger from the palm
rest onto your laptop's trackpad (**Glide**), and notices the shortcut
sequences you repeat so you can turn one into one of those actions (**Flow**).
No extra hardware is needed. A dedicated physical device is the long-term
plan; v0.1 does not depend on it, and its UI is behind developer tools.

One story: *I'm in an app → I swipe in from a side → the action for that
zone runs in that app. Flow noticed something I keep doing → I check its
steps → I put it on a zone.*

## Users

People who live in a handful of apps on a Windows laptop with a precision
touchpad: first, Purdue students in a small external beta. They have never
heard of Noma and give it a few minutes to prove itself.

## The v0.1 workflow

1. **Install and launch.** Single instance, tray icon, Noma identity on the
   taskbar and in notifications.
2. **Onboarding, four screens.** What Noma is (one sentence) → Meet Glide
   (gesture demonstration, turn it on, one real practice swipe that only
   lights its zone) → Flow (what it records and never records; opt in or
   not) → Your first action (pick an app, see or change its four zones,
   switch to it and swipe; the screen confirms what actually ran).
3. **Daily use.** Glide works in any app with Noma's window closed to the
   tray. Swipes are practice only while Noma itself is in front.
4. **Flow.** After about three repeats of the same shortcut sequence, a
   suggestion appears (in-app and as a small bottom-centre notice). "Review
   steps" shows exactly what will run, flags steps that may not replay, and
   asks which Glide zone should run it. Nothing is saved or run without that
   choice.
5. **Return.** Settings, Glide on/off, zone count, zone actions and saved
   workflows persist in local SQLite. Home shows a getting-started checklist
   until each step has really happened.

## What's real

- Foreground-app detection; four actions per app (starter actions for
  Chrome, VS Code and Spotify; any other app can be set up in one click).
- Glide on Windows precision touchpads (raw HID reports) and Mac trackpads
  (MultitouchSupport, macTrackpad.ts; launch-checked in CI, not yet tried
  with a finger on a real Mac): a pure tested
  recognizer, pointer put back after a swipe, typing/palm/two-finger/click
  rejection, owned by the main process.
- Real execution of shortcuts, saved workflows, app focus, named-button
  clicks; one action at a time; stop between steps (app bar or tray).
- Flow: modifier-only capture, hard "makes sense" rules, learned quality
  filter, step preview, pause / change zone / remove for saved workflows.
- Demo Mode (developer tools only): scripted, labelled "Demo", and its reset
  removes only demo data.
- Beta bug reports: a visible, copyable technical summary and the issue page;
  nothing is sent automatically.

## Constraints and never-claims

- Flow records which app, which modifier shortcut, which Noma action, and
  when. Never typed text, screenshots, clipboard, or passwords. No network
  calls except the update check against GitHub Releases.
- Glide is verified on one laptop (ASUS ROG Zephyrus G14). Do not claim
  broad touchpad compatibility. macOS: the packaged app is launch-checked on
  CI's Mac runner, but no one has used it on a real Mac yet, and Glide's
  thresholds were tuned on a Windows touchpad.
- No physical device exists for users; never fake a hardware connection.
- Visual identity: near-black graphite, Sora, JetBrains Mono, blue
  accent `#4c7eff`, violet only to mark a Flow suggestion, gold only for real
  hardware contact. No AI gradients or glow, no fake 3D hardware.
- Voice: plain, specific, quiet. No marketing clichés or hype language.

## Product principles

1. Get the user to one working action fast; explain only what's needed.
2. Real, not simulated: every state shown is the actual state. The demo is
   the one labelled exception.
3. Nothing runs that the user didn't choose, and they can see what it will
   do first.
4. Calm over loud.
