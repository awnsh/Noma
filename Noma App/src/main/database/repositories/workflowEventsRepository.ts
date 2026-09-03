import type {
  DailyActivityCount,
  ShortcutUsageStat,
  WorkflowEvent,
  WorkflowEventType
} from '@shared/types'
import { getDatabase } from '../db'
import { localDateKey, startOfDayMs } from '../../workflow/timeWindows'

interface WorkflowEventRow {
  id: number
  application_id: string | null
  event_type: WorkflowEventType
  combo_keys: string | null
  control_id: string | null
  timestamp: number
}

export function insertWorkflowEvent(event: {
  applicationId: string | null
  eventType: WorkflowEventType
  comboKeys?: string[]
  controlId?: string
  timestamp: number
}): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO workflow_events (application_id, event_type, combo_keys, control_id, timestamp)
     VALUES (@applicationId, @eventType, @comboKeys, @controlId, @timestamp)`
  ).run({
    applicationId: event.applicationId,
    eventType: event.eventType,
    comboKeys: event.comboKeys ? JSON.stringify(event.comboKeys) : null,
    controlId: event.controlId ?? null,
    timestamp: event.timestamp
  })
}

export function getWorkflowEventsSince(sinceTimestamp: number): WorkflowEvent[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT id, application_id, event_type, combo_keys, control_id, timestamp
       FROM workflow_events
       WHERE timestamp >= ?
       ORDER BY timestamp ASC`
    )
    .all(sinceTimestamp) as WorkflowEventRow[]

  return rows.map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    eventType: row.event_type,
    comboKeys: row.combo_keys ? (JSON.parse(row.combo_keys) as string[]) : undefined,
    controlId: row.control_id ?? undefined,
    timestamp: row.timestamp
  }))
}

interface ShortcutUsageRow {
  application_id: string | null
  application_name: string | null
  combo_keys: string
  count: number
  first_used: number
  last_used: number
}

/**
 * Every shortcut Flow has ever captured, aggregated by the exact combo +
 * application it happened in — over *all* recorded history, unlike
 * `getWorkflowEventsSince` which every other caller uses for a "since X"
 * window. Grouping on the raw `combo_keys` JSON string (rather than
 * re-parsing and re-joining it) is safe because a given combo is always
 * serialized in the same key order — `comboFromKeydownEvent` builds it
 * deterministically, and patternDetection.ts already relies on the same
 * assumption for its own per-combo grouping.
 */
export function getShortcutUsageStats(): ShortcutUsageStat[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT
         we.application_id AS application_id,
         a.name AS application_name,
         we.combo_keys AS combo_keys,
         COUNT(*) AS count,
         MIN(we.timestamp) AS first_used,
         MAX(we.timestamp) AS last_used
       FROM workflow_events we
       LEFT JOIN applications a ON a.id = we.application_id
       WHERE we.event_type = 'shortcut' AND we.combo_keys IS NOT NULL
       GROUP BY we.application_id, we.combo_keys
       ORDER BY count DESC, last_used DESC`
    )
    .all() as ShortcutUsageRow[]

  return rows.map((row) => ({
    id: `${row.application_id ?? 'none'}::${row.combo_keys}`,
    comboKeys: JSON.parse(row.combo_keys) as string[],
    applicationId: row.application_id,
    applicationName: row.application_name,
    count: row.count,
    firstUsed: row.first_used,
    lastUsed: row.last_used
  }))
}

/**
 * Shortcut-press counts per local day for the last `days` days (inclusive
 * of today), oldest first, zero-filled for days with no activity so a chart
 * over this data never has to guess whether a missing day means "no data
 * yet" or "genuinely zero". Bucketed in JS against `localDateKey` rather
 * than SQLite's own date functions, which operate on UTC by default and
 * would drift from the local-day boundary `startOfTodayMs` uses everywhere
 * else in the app.
 */
export function getDailyActivityCounts(days: number): DailyActivityCount[] {
  const db = getDatabase()
  const todayStart = startOfDayMs(new Date())
  const rangeStart = todayStart - (days - 1) * 24 * 60 * 60 * 1000

  const counts = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    counts.set(localDateKey(new Date(rangeStart + i * 24 * 60 * 60 * 1000)), 0)
  }

  const rows = db
    .prepare(`SELECT timestamp FROM workflow_events WHERE event_type = 'shortcut' AND timestamp >= ?`)
    .all(rangeStart) as Array<{ timestamp: number }>

  for (const row of rows) {
    const key = localDateKey(new Date(row.timestamp))
    // A row's timestamp can't fall before rangeStart (the query already
    // filters that), but it CAN land on a future local day than expected in
    // theory (clock changes) — ignore anything that doesn't match one of
    // the pre-seeded buckets rather than silently growing the map.
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()].map(([date, count]) => ({ date, count }))
}
