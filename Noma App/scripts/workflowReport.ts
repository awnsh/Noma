/**
 * Shows what Flow captured and detected over the last N minutes, using the
 * real detector on the real events in %APPDATA%/noma/noma.db. For testing
 * workflow learning by hand: do a workflow a few times, then run this.
 *
 * Bundle: npx esbuild scripts/workflowReport.ts --bundle --platform=node
 *           --external:better-sqlite3 --alias:@shared=./src/shared --outfile=<tmp>.cjs
 * Run:    node <tmp>.cjs [minutes=10]
 */
import { join } from 'path'
import Database from 'better-sqlite3'
import type { WorkflowEvent } from '@shared/types'
import { describeStep, detectPatterns } from '../src/main/workflow/patternDetection'

const minutes = Number(process.argv[2] ?? 10)
const since = Date.now() - minutes * 60_000
const db = new Database(join(process.env.APPDATA ?? '', 'noma', 'noma.db'), { readonly: true })
const setting = (key: string): string | undefined =>
  (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value
console.log(`monitoring ${setting('workflowMonitoringEnabled')}, click capture ${setting('clickCaptureEnabled')}`)

const rows = db
  .prepare(
    `SELECT id, application_id, event_type, combo_keys, control_id, click_target, timestamp
     FROM workflow_events WHERE timestamp >= ? ORDER BY timestamp ASC`
  )
  .all(since) as Array<{
  id: number
  application_id: string | null
  event_type: WorkflowEvent['eventType']
  combo_keys: string | null
  control_id: string | null
  click_target: string | null
  timestamp: number
}>
const events: WorkflowEvent[] = rows.map((row) => ({
  id: row.id,
  applicationId: row.application_id,
  eventType: row.event_type,
  comboKeys: row.combo_keys ? (JSON.parse(row.combo_keys) as string[]) : undefined,
  controlId: row.control_id ?? undefined,
  clickTarget: row.click_target ?? undefined,
  timestamp: row.timestamp
}))

console.log(`\n== captured in the last ${minutes} min: ${events.length} events`)
let previous = 0
for (const event of events) {
  const gap = previous ? `+${((event.timestamp - previous) / 1000).toFixed(1)}s` : ''
  previous = event.timestamp
  const what =
    event.eventType === 'shortcut'
      ? (event.comboKeys ?? []).join('+')
      : event.eventType === 'click'
        ? event.clickTarget
        : event.eventType === 'appSwitch'
          ? '→ switched in'
          : (event.controlId ?? '')
  console.log(
    `  ${new Date(event.timestamp).toLocaleTimeString().padEnd(12)} ${gap.padStart(7)}  ${String(event.applicationId).padEnd(16)} ${event.eventType.padEnd(17)} ${what}`
  )
}

// The detector runs over a full day of history in the app; over this
// window it shows exactly what this test produced.
const patterns = detectPatterns(events)
console.log(`\n== detected from this window: ${patterns.length} patterns`)
for (const pattern of patterns) {
  const steps =
    'steps' in pattern && pattern.steps
      ? pattern.steps.map((step) => describeStep(step)).join('  →  ')
      : 'sequence' in pattern && pattern.sequence
        ? pattern.sequence.join('  →  ')
        : 'comboKeys' in pattern && pattern.comboKeys
          ? pattern.comboKeys.join('+')
          : ''
  console.log(`  [${pattern.kind}] x${pattern.count}  ${steps}`)
}

const suggestions = db
  .prepare(`SELECT id, status, title, created_at FROM suggestions ORDER BY created_at DESC LIMIT 6`)
  .all() as Array<{ id: string; status: string; title: string; created_at: number }>
console.log('\n== newest suggestions in the app')
for (const s of suggestions) console.log(`  ${s.status.padEnd(9)} ${s.title}   (${s.id.slice(0, 70)})`)
