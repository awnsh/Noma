#!/usr/bin/env bash
# Builds Noma and installs it in /Applications for local testing on a Mac.
#
# Why the signing step looks odd: an ad-hoc signature identifies an app by a hash of its
# exact contents, so macOS treats every rebuild as a new app and forgets the Accessibility
# and Input Monitoring permissions, asking again on every launch. Giving the app one fixed
# designated requirement (its bundle id) lets macOS keep the grant across rebuilds. The
# nested frameworks are signed normally first; the requirement goes on the app only.
# This is for local installs. Release builds are signed by the release workflow.
#
# After the first run with this signing, grant the permissions once. If a stale entry
# from an older build is stuck, reset it with:
#   tccutil reset Accessibility com.noma.app && tccutil reset ListenEvent com.noma.app
set -euo pipefail
cd "$(dirname "$0")/.."

ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then ELECTRON_ARCH=arm64; OUT_DIR=dist/mac-arm64; else ELECTRON_ARCH=x64; OUT_DIR=dist/mac; fi
APP=/Applications/Noma.app

npm run build
npx electron-builder --mac dir "--$ELECTRON_ARCH" --publish never -c.mac.identity=null

osascript -e 'tell application "Noma" to quit' >/dev/null 2>&1 || true
for _ in $(seq 1 20); do pgrep -f "$APP/Contents/MacOS/Noma" >/dev/null || break; sleep 1; done

rm -rf "$APP"
ditto "$OUT_DIR/Noma.app" "$APP"
codesign --force --deep --sign - "$APP"
codesign --force --sign - -r='designated => identifier "com.noma.app"' "$APP"
codesign --verify --deep --strict "$APP"

open "$APP"
echo "Installed $(defaults read "$APP/Contents/Info" CFBundleShortVersionString) at $APP"
