/**
 * What changed in each version, shown once after Noma updates to it
 * (main/whatsNew.ts, renderer WhatsNewModal). Newest first. Written for the
 * people using Noma: what they'll notice, not how it was built.
 *
 * `npm run release` refuses to tag a version that has no entry here, so add
 * the next version's notes before releasing.
 */
export const RELEASE_NOTES: Record<string, string[]> = {
  '0.1.13': [
    'Mac: Flow now starts learning as soon as you allow Accessibility, without restarting Noma.',
    'Mac: if Accessibility is off (or macOS stopped trusting Noma after an update), Noma tells you and opens the right settings page.',
    'Mac: Option+letter is typing, so Flow never records it.',
    'Mac: shortcuts read the way your keyboard does: Cmd and Option, and Cmd+V shows as Paste.'
  ],
  '0.1.12': [
    'Glide: "Clear zone" empties a zone, and the new App shortcut option picks from built-in shortcuts for 22 popular apps.',
    'Macro Studio: add a "Switch window" step, and unsaved edits stay put when you move between macros.',
    'Workflows made only of switching between apps now save and run properly.',
    'The Controls page is gone: edit zones on the Glide page, and open a saved workflow in Macro Studio.',
    'Popups close with Escape or a click outside them.',
    'Report a problem now opens the report form on nomashift.com.'
  ],
  '0.1.10': [
    'Noma has a new app icon, matching the one on nomashift.com.',
    'Found a bug or have an idea? Tell us at nomashift.com/feedback.'
  ],
  '0.1.9': [
    'After an update, Noma shows what changed.'
  ],
  '0.1.8': [
    'Settings has a new Updates section: check for a new version any time, and restart to install it once it has downloaded.'
  ]
}

/** -1, 0 or 1, comparing dotted version numbers like 0.1.8. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0)
    if (difference !== 0) return difference > 0 ? 1 : -1
  }
  return 0
}

/**
 * The notes to show someone who last saw `lastSeen` and now runs `current`,
 * newest first. With no `lastSeen` (they updated from a build older than
 * these notes), the latest `fallbackCount` entries up to `current`.
 */
export function notesSince(
  lastSeen: string | null,
  current: string,
  fallbackCount = 2
): Array<{ version: string; notes: string[] }> {
  const entries = Object.entries(RELEASE_NOTES)
    .filter(([version]) => compareVersions(version, current) <= 0)
    .filter(([version]) => lastSeen === null || compareVersions(version, lastSeen) > 0)
    .sort(([a], [b]) => compareVersions(b, a))
    .map(([version, notes]) => ({ version, notes }))
  return lastSeen === null ? entries.slice(0, fallbackCount) : entries
}
