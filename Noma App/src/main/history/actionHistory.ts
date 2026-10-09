import { readFile } from 'fs/promises'
import type { ActionHistory, ActionHistoryEntry, ControlRunStats } from '@shared/types'

/** Default and ceiling for how many recent entries a caller gets back. The
 *  log itself is trimmed by its writer (main/index.ts), so the ceiling only
 *  guards against an absurd request, not against an unbounded file. */
export const DEFAULT_HISTORY_LIMIT = 50
export const MAX_HISTORY_LIMIT = 500

/**
 * One line of logs/actions.jsonl into an entry, or null when the line isn't
 * one. Lines are written one press at a time, so a torn final line (a crash
 * or a write still in flight) or a hand-edited file are both expected; a
 * bad line is skipped, never fatal. `controlId` is optional: older lines
 * only carry the control's label.
 */
export function parseActionLogLine(line: string): ActionHistoryEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  if (typeof value.at !== 'string' || typeof value.ok !== 'boolean') return null
  const atMs = Date.parse(value.at)
  if (Number.isNaN(atMs)) return null
  return {
    at: atMs,
    control: typeof value.control === 'string' ? value.control : '',
    controlId: typeof value.controlId === 'string' && value.controlId ? value.controlId : undefined,
    actionType: typeof value.actionType === 'string' ? value.actionType : 'unknown',
    ok: value.ok,
    reason: typeof value.reason === 'string' && value.reason ? value.reason : undefined
  }
}

/** The key per-control stats are grouped by: the stable id when the line has
 *  one, otherwise the label (which can be renamed, so it's a best effort). */
export function controlKey(entry: Pick<ActionHistoryEntry, 'controlId' | 'control'>): string {
  return entry.controlId ? `id:${entry.controlId}` : `label:${entry.control}`
}

/** Pure summary over already-parsed entries, oldest first (file order). */
export function summarizeActionHistory(entries: ActionHistoryEntry[], limit = DEFAULT_HISTORY_LIMIT): ActionHistory {
  const safeLimit = clampLimit(limit)
  const byControl = new Map<string, ControlRunStats>()
  for (const entry of entries) {
    const key = controlKey(entry)
    const stats = byControl.get(key) ?? {
      key,
      control: entry.control,
      controlId: entry.controlId,
      actionType: entry.actionType,
      successCount: 0,
      failureCount: 0,
      lastAt: entry.at,
      lastOk: entry.ok
    }
    if (entry.ok) stats.successCount += 1
    else stats.failureCount += 1
    if (entry.at >= stats.lastAt) {
      stats.lastAt = entry.at
      stats.lastOk = entry.ok
      stats.lastReason = entry.ok ? undefined : entry.reason
      stats.control = entry.control
      stats.actionType = entry.actionType
    }
    byControl.set(key, stats)
  }

  return {
    recent: entries.slice(-safeLimit).reverse(),
    controls: [...byControl.values()].sort((a, b) => b.lastAt - a.lastAt),
    total: entries.length
  }
}

/**
 * Reads the action log read-only and returns the newest `limit` entries
 * (newest first) plus success/failure counts per control. A missing or
 * unreadable file is an empty history, not an error: a fresh install has
 * never pressed anything. Counts cover only what the log still holds,
 * since its writer keeps a bounded tail.
 */
export async function readActionHistory(file: string, limit = DEFAULT_HISTORY_LIMIT): Promise<ActionHistory> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch {
    return { recent: [], controls: [], total: 0 }
  }
  const entries = text
    .split(/\r?\n/)
    .map(parseActionLogLine)
    .filter((entry): entry is ActionHistoryEntry => entry !== null)
  return summarizeActionHistory(entries, limit)
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_HISTORY_LIMIT
  return Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.floor(limit)))
}
