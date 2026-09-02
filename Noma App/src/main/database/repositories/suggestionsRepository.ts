import type { ConfidenceBreakdown, PatternKind, Suggestion, SuggestionAction, SuggestionStatus } from '@shared/types'
import { getDatabase } from '../db'

interface SuggestionRow {
  id: string
  title: string
  explanation: string
  confidence: number
  status: SuggestionStatus
  created_at: number
  resolved_at: number | null
  application_id: string | null
  /** Joined live from `applications.name` — see the SELECTs below. Never a
   *  persisted column of its own, so it can't go stale the way a name
   *  frozen at suggestion-creation time could (e.g. if a profile is later
   *  renamed). */
  application_name: string | null
  action_kind: string | null
  action_payload: string | null
  confidence_breakdown: string | null
}

const SUGGESTION_SELECT = `
  SELECT s.*, a.name AS application_name
  FROM suggestions s
  LEFT JOIN applications a ON a.id = s.application_id
`

function rowToSuggestion(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    title: row.title,
    explanation: row.explanation,
    confidence: row.confidence,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    applicationId: row.application_id,
    applicationName: row.application_name,
    // action_kind/action_payload/confidence_breakdown are only absent for
    // rows from before those columns existed — degrade gracefully rather
    // than throw.
    action:
      row.action_kind && row.action_payload
        ? (JSON.parse(row.action_payload) as SuggestionAction)
        : undefined,
    confidenceBreakdown: row.confidence_breakdown
      ? (JSON.parse(row.confidence_breakdown) as ConfidenceBreakdown)
      : undefined
  }
}

export function getPendingSuggestions(): Suggestion[] {
  const db = getDatabase()
  const rows = db
    .prepare(`${SUGGESTION_SELECT} WHERE s.status = 'pending' ORDER BY s.created_at DESC`)
    .all() as SuggestionRow[]
  return rows.map(rowToSuggestion)
}

/** Every suggestion ever generated, regardless of status — the Flow
 *  Learning Center's history list, most recent first. */
export function getAllSuggestions(): Suggestion[] {
  const db = getDatabase()
  const rows = db.prepare(`${SUGGESTION_SELECT} ORDER BY s.created_at DESC`).all() as SuggestionRow[]
  return rows.map(rowToSuggestion)
}

export function getSuggestionById(id: string): Suggestion | null {
  const db = getDatabase()
  const row = db.prepare(`${SUGGESTION_SELECT} WHERE s.id = ?`).get(id) as SuggestionRow | undefined
  return row ? rowToSuggestion(row) : null
}

/**
 * Inserts a new pending suggestion, unless a suggestion with this id
 * already exists in ANY status. This is what makes the pattern ->
 * suggestion pipeline safe to re-run on every captured event: a pattern
 * that's already pending isn't duplicated, and one the user already
 * accepted/rejected/dismissed is never resurrected.
 */
export function insertSuggestionIfNew(suggestion: Suggestion): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO suggestions
       (id, title, explanation, confidence, status, created_at, resolved_at,
        application_id, action_kind, action_payload, confidence_breakdown)
     VALUES
       (@id, @title, @explanation, @confidence, @status, @createdAt, @resolvedAt,
        @applicationId, @actionKind, @actionPayload, @confidenceBreakdown)
     ON CONFLICT(id) DO NOTHING`
  ).run({
    id: suggestion.id,
    title: suggestion.title,
    explanation: suggestion.explanation,
    confidence: suggestion.confidence,
    status: suggestion.status,
    createdAt: suggestion.createdAt,
    resolvedAt: suggestion.resolvedAt ?? null,
    applicationId: suggestion.applicationId ?? null,
    actionKind: suggestion.action?.kind ?? null,
    actionPayload: suggestion.action ? JSON.stringify(suggestion.action) : null,
    confidenceBreakdown: suggestion.confidenceBreakdown
      ? JSON.stringify(suggestion.confidenceBreakdown)
      : null
  })
}

export function resolveSuggestion(
  id: string,
  status: 'accepted' | 'rejected' | 'dismissed'
): Suggestion | null {
  const db = getDatabase()
  db.prepare(`UPDATE suggestions SET status = @status, resolved_at = @resolvedAt WHERE id = @id`).run(
    { id, status, resolvedAt: Date.now() }
  )
  return getSuggestionById(id)
}

/** suggestion ids are always `suggestion:<pattern.id>`, and pattern.id is
 *  always `<kindPrefix>:...` (see patternDetection.ts) — reused here to
 *  scope the accept/reject history to one pattern kind without a schema
 *  change. */
function idPrefixForKind(kind: PatternKind): string {
  switch (kind) {
    case 'repeatedShortcut':
      return 'suggestion:shortcut:'
    case 'repeatedSequence':
      return 'suggestion:sequence:'
    case 'frequentControl':
      return 'suggestion:control:'
  }
}

/** A pattern kind's historical accept/reject record, and the deterministic
 *  confidence nudge derived from it — see getSuggestionHistoryForKind. */
export interface SuggestionHistory {
  accepted: number
  rejected: number
  bias: number
}

/**
 * The "UPDATE USER MODEL / IMPROVE FUTURE SUGGESTIONS" step of the
 * learning loop (brainstorm.md section 14): a deterministic, explainable
 * nudge based on this pattern kind's historical accept/reject ratio,
 * bounded to +-0.15 so it can influence but never dominate a suggestion's
 * base confidence. Returns the raw accepted/rejected counts alongside the
 * bias itself so a suggestion's confidenceBreakdown (Product Development
 * Phase 2 — "Explainable Flow Suggestions") can show real numbers instead
 * of just the resulting nudge.
 */
export function getSuggestionHistoryForKind(kind: PatternKind): SuggestionHistory {
  const db = getDatabase()
  const prefix = idPrefixForKind(kind)
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM suggestions
       WHERE id LIKE @pattern ESCAPE '\\'`
    )
    .get({ pattern: `${escapeLike(prefix)}%` }) as {
    accepted: number | null
    rejected: number | null
  }

  const accepted = row.accepted ?? 0
  const rejected = row.rejected ?? 0
  const total = accepted + rejected
  const bias = total === 0 ? 0 : ((accepted - rejected) / total) * 0.15

  return { accepted, rejected, bias }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}
