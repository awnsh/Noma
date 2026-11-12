import { audienceForPath } from '../data/audiences'

/**
 * Where a signup came from, sent with the email to Formspree (2026-11-03,
 * for comparing the audience landing pages):
 *
 * - source: the page the form was on ('editors', 'home', 'device', ...)
 * - landing_page: the first page of the visit, which is the one the ad
 *   pointed at even if the person clicked around before signing up
 * - utm_source / utm_medium / utm_campaign / utm_content from the ad link
 *
 * The landing page and UTMs are kept in sessionStorage for the visit only,
 * because client-side navigation drops the query string. Nothing here is a
 * cookie, and nothing leaves the browser unless the person signs up. The
 * privacy policy (pages/Privacy.tsx) says so; keep them in step.
 */

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const STORE_KEY = 'noma-attribution'

type Visit = Partial<Record<(typeof UTM_KEYS)[number] | 'landing_page', string>>

// Fallback for when sessionStorage throws (private windows, blocked storage).
let memory: Visit | null = null

/** The page name a path is reported as. */
export function sourceForPath(pathname: string): string {
  return audienceForPath(pathname) ?? (pathname.replace(/^\/+|\/+$/g, '') || 'home')
}

function read(): Visit | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as Visit
  } catch {
    // fall through to memory
  }
  return memory
}

function write(visit: Visit) {
  memory = visit
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(visit))
  } catch {
    // memory copy is enough for this page load
  }
}

/**
 * Call once per page load, before the router can change the URL. The first
 * load of the visit sets the landing page; a later load that carries UTMs
 * (a second ad click in the same tab) replaces the whole record. Returns
 * whether this load started a new visit (counted by lib/events.ts).
 */
export function captureAttribution(location: Pick<Location, 'pathname' | 'search'>): boolean {
  const params = new URLSearchParams(location.search)
  const utms: Visit = {}
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim()
    if (value) utms[key] = value.slice(0, 200)
  }
  const hasUtms = Object.keys(utms).length > 0
  if (read() && !hasUtms) return false
  write({ landing_page: sourceForPath(location.pathname), ...utms })
  return true
}

/** The fields to send with a signup made on `pathname`. */
export function attributionFields(pathname: string): Record<string, string> {
  const visit = read() ?? {}
  const fields: Record<string, string> = { source: sourceForPath(pathname) }
  for (const [key, value] of Object.entries(visit)) if (value) fields[key] = value
  return fields
}
