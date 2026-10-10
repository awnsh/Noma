// Runs before every test file, ahead of setup.ts. With NOMA_TEST_PLATFORM
// set to 'win32' or 'darwin', Noma's own code believes it is on that OS:
// main/platform.ts's isWindows/isMac (the one place the main process asks)
// and the renderer's user agent (what renderer/src/lib/platform.ts reads)
// both report it. That lets one machine check the other OS's logic:
// `npm run test:mac` on Windows, `npm run test:windows` on a Mac.
//
// process.platform itself is left alone: native libraries (better-sqlite3,
// uiohook-napi, koffi) pick their binary from it, and those have to be the
// host's. Tests that call real OS APIs can't run as the other OS at all;
// they check test/hostPlatform.ts and sit a simulated run out.

import { vi } from 'vitest'

const simulated = process.env.NOMA_TEST_PLATFORM

if (simulated && simulated !== 'win32' && simulated !== 'darwin') {
  throw new Error(`NOMA_TEST_PLATFORM must be 'win32' or 'darwin', not '${simulated}'`)
}

// vi.mock is hoisted above everything else in this file, so it can't sit
// inside the check below: without a simulation it hands back the real
// module untouched.
vi.mock('../main/platform', async (importOriginal) => {
  const platform = process.env.NOMA_TEST_PLATFORM
  if (!platform) return importOriginal()
  return { isWindows: platform === 'win32', isMac: platform === 'darwin' }
})

// The renderer asks the user agent (renderer/src/lib/platform.ts looks for
// "Mac"), and jsdom's own says "(darwin)" or "(win32)": on a real Mac the
// renderer would believe it's on Windows. So it is set for every run, to
// the simulated OS or else the real one.
const effective = simulated ?? process.platform
if (typeof navigator !== 'undefined' && (effective === 'darwin' || effective === 'win32')) {
  const userAgent =
    effective === 'darwin'
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) jsdom'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) jsdom'
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true })
}
