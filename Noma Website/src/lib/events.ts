import { attributionFields } from './attribution'

/**
 * Counts a visit, a beta download or an email signup (2026-11-03), tagged
 * with the page and the ad's campaign tags from lib/attribution.ts, so the
 * audience landing pages can be compared on what people actually do.
 * Received by worker/index.ts, read with `npm run stats`.
 *
 * sendBeacon, because a download click hands the tab to GitHub's file
 * straight away and a normal fetch could be cut off. Never throws, never
 * blocks: counting is not worth breaking a download over.
 */
export type SiteEvent = 'visit' | 'download' | 'signup'

export function trackEvent(event: SiteEvent, pathname: string, detail = '') {
  try {
    const body = JSON.stringify({ event, detail, ...attributionFields(pathname) })
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon?.('/api/event', blob)) return
    void fetch('/api/event', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
      () => {},
    )
  } catch {
    // counting is best-effort
  }
}
