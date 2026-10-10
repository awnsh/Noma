// For tests that call real OS APIs (window handles, app icons, the
// trackpad): whether this run is genuinely on that OS. A run simulating the
// other OS (NOMA_TEST_PLATFORM, see simulatePlatform.ts) has Noma's code
// taking that OS's branches, which can't reach this host's APIs, so these
// tests sit it out. Logic tests use main/platform.ts's isMac/isWindows
// instead, which follow the simulation.

/** True when this run simulates the other OS: native tests sit it out. */
export const simulatingOtherOS =
  process.env.NOMA_TEST_PLATFORM !== undefined && process.env.NOMA_TEST_PLATFORM !== process.platform

export const onRealWindows = process.platform === 'win32' && !simulatingOtherOS
export const onRealMac = process.platform === 'darwin' && !simulatingOtherOS
