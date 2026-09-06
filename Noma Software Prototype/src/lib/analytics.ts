/**
 * Validation Mode's data layer — section 12/13 of the prototype brief.
 * Everything is local (localStorage), append-only, and namespaced under
 * `noma-proto:*` so it survives reloads/reopens on the same machine across
 * many test participants, which is the point: this prototype is meant to be
 * put in front of 20-30 people on the same laptop and read back afterward.
 *
 * No network calls, no account system — matches the Noma App's existing
 * "100% local" trust posture (see its PRODUCT.md) even though this is a
 * separate, disposable prototype rather than that real product.
 */

export type NomaEventType =
  | 'app_select'
  | 'control_press'
  | 'pattern_recognized'
  | 'customize_reorder'
  | 'customize_pin'
  | 'customize_remove'
  | 'customize_restore'
  | 'customize_reset'
  | 'survey_submit'

export interface NomaEvent {
  id: string
  sessionId: string
  type: NomaEventType
  timestamp: number
  appId?: string
  controlId?: string
  controlLabel?: string
  detail?: string
}

export interface SessionRecord {
  id: string
  start: number
  end: number
  appsVisited: string[]
}

export interface SurveyResponse {
  id: string
  sessionId: string
  timestamp: number
  replace: string
  worth: string
  adaptTo: string
  missing: string
}

const EVENTS_KEY = 'noma-proto:events'
const SESSIONS_KEY = 'noma-proto:sessions'
const SURVEY_KEY = 'noma-proto:survey'
/** Caps growth across a long day of back-to-back demo sessions. */
const MAX_EVENTS = 4000

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable (private browsing) — the prototype still
    // works in-memory for the current session, it just won't persist.
  }
}

export function startSession(): SessionRecord {
  const session: SessionRecord = { id: uid(), start: Date.now(), end: Date.now(), appsVisited: [] }
  const sessions = readJSON<SessionRecord[]>(SESSIONS_KEY, [])
  sessions.push(session)
  writeJSON(SESSIONS_KEY, sessions)
  return session
}

/** Updates a session's `end` timestamp on every interaction, so duration
 *  stays accurate even without a clean tab-close event to hook. */
function touchSession(sessionId: string, appId?: string): void {
  const sessions = readJSON<SessionRecord[]>(SESSIONS_KEY, [])
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) return
  session.end = Date.now()
  if (appId && !session.appsVisited.includes(appId)) session.appsVisited.push(appId)
  writeJSON(SESSIONS_KEY, sessions)
}

export function logEvent(sessionId: string, type: NomaEventType, fields: Partial<NomaEvent> = {}): void {
  const events = readJSON<NomaEvent[]>(EVENTS_KEY, [])
  events.push({ id: uid(), sessionId, type, timestamp: Date.now(), ...fields })
  writeJSON(EVENTS_KEY, events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events)
  touchSession(sessionId, fields.appId)
}

export function submitSurvey(response: Omit<SurveyResponse, 'id' | 'timestamp'>): void {
  const responses = readJSON<SurveyResponse[]>(SURVEY_KEY, [])
  responses.push({ ...response, id: uid(), timestamp: Date.now() })
  writeJSON(SURVEY_KEY, responses)
}

export function clearAllData(): void {
  window.localStorage.removeItem(EVENTS_KEY)
  window.localStorage.removeItem(SESSIONS_KEY)
  window.localStorage.removeItem(SURVEY_KEY)
}

export interface AnalyticsSummary {
  sessionCount: number
  avgDurationMs: number
  totalControlPresses: number
  appUsage: { appId: string; count: number }[]
  topControls: { key: string; appId: string; label: string; count: number }[]
  patternsRecognized: number
  topPatterns: { label: string; count: number }[]
  returningRate: number // fraction of sessions that visited >1 app
  survey: SurveyResponse[]
  replaceBreakdown: { answer: string; count: number }[]
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = readJSON<NomaEvent[]>(EVENTS_KEY, [])
  const sessions = readJSON<SessionRecord[]>(SESSIONS_KEY, [])
  const survey = readJSON<SurveyResponse[]>(SURVEY_KEY, [])

  const durations = sessions.map((s) => Math.max(0, s.end - s.start))
  const avgDurationMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  const appCounts = new Map<string, number>()
  const controlCounts = new Map<string, { appId: string; label: string; count: number }>()
  let totalControlPresses = 0
  let patternsRecognized = 0
  const patternLabelCounts = new Map<string, number>()

  for (const event of events) {
    if (event.type === 'control_press' && event.appId) {
      totalControlPresses += 1
      appCounts.set(event.appId, (appCounts.get(event.appId) ?? 0) + 1)
      const key = `${event.appId}:${event.controlId}`
      const existing = controlCounts.get(key)
      controlCounts.set(key, {
        appId: event.appId,
        label: event.controlLabel ?? event.controlId ?? '?',
        count: (existing?.count ?? 0) + 1,
      })
    }
    if (event.type === 'pattern_recognized') {
      patternsRecognized += 1
      const label = event.detail ?? 'Pattern'
      patternLabelCounts.set(label, (patternLabelCounts.get(label) ?? 0) + 1)
    }
  }

  const appUsage = [...appCounts.entries()]
    .map(([appId, count]) => ({ appId, count }))
    .sort((a, b) => b.count - a.count)

  const topControls = [...controlCounts.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const returningSessions = sessions.filter((s) => s.appsVisited.length > 1).length
  const returningRate = sessions.length ? returningSessions / sessions.length : 0

  const replaceCounts = new Map<string, number>()
  for (const r of survey) {
    if (!r.replace) continue
    replaceCounts.set(r.replace, (replaceCounts.get(r.replace) ?? 0) + 1)
  }

  return {
    sessionCount: sessions.length,
    avgDurationMs,
    totalControlPresses,
    appUsage,
    topControls,
    patternsRecognized,
    topPatterns: [...patternLabelCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    returningRate,
    survey: [...survey].sort((a, b) => b.timestamp - a.timestamp),
    replaceBreakdown: [...replaceCounts.entries()].map(([answer, count]) => ({ answer, count })),
  }
}
