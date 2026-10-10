// Runs the test suite as if on the other OS, from whichever machine you're
// on, so a change made on Windows is checked against the Mac code paths
// without a Mac (and the other way round). See src/test/simulatePlatform.ts
// for what is simulated and what still needs the real OS.
//
//   npm run test:mac       -> every test, with Noma's code taking its macOS paths
//   npm run test:windows   -> the same, Windows paths
//   npm run test:both      -> as Windows, then as macOS
//
// Extra arguments go to vitest: `npm run test:mac -- src/main/workflow`.
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))

const target = process.argv[2]
const platforms = { windows: ['win32'], mac: ['darwin'], both: ['win32', 'darwin'] }[target]
if (!platforms) {
  console.error(`Unknown target "${target}". Use windows, mac or both.`)
  process.exit(1)
}

for (const platform of platforms) {
  console.log(`\nTesting as ${platform === 'darwin' ? 'macOS' : 'Windows'} (NOMA_TEST_PLATFORM=${platform})\n`)
  const result = spawnSync(process.execPath, [vitest, 'run', ...process.argv.slice(3)], {
    stdio: 'inherit',
    env: { ...process.env, NOMA_TEST_PLATFORM: platform }
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
