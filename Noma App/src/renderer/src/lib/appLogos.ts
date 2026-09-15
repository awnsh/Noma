import chromeLogo from '../assets/logos/chrome.svg'
import spotifyLogo from '../assets/logos/spotify.svg'
import claudeLogo from '../assets/logos/claude.svg'

/**
 * Real, official application logos, keyed by the same `applicationId`
 * Noma already uses everywhere else (`code`, `chrome`, `spotify`, the demo's
 * `claude`) — sourced as static SVG assets from Simple Icons (CC0-licensed,
 * exact brand marks), not hand-drawn or approximated. Deliberately a small,
 * curated set covering only the applications Noma's own seed data and demo
 * actually name; any other application (including ones the OS detects live,
 * which can be anything) simply has no entry here and falls back to a
 * monogram wherever a logo would go — see `AppLogo`.
 *
 * `code` (Visual Studio Code) has no entry on purpose: it isn't in Simple
 * Icons' catalog (confirmed against the full icon list, not a lookup miss),
 * not an oversight.
 */
export const APP_LOGOS: Record<string, string> = {
  chrome: chromeLogo,
  spotify: spotifyLogo,
  claude: claudeLogo
}
