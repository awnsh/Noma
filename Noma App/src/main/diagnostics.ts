import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { arch, release } from 'os'
import type { GlideState, SuggestionStatus } from '@shared/types'
import { getDatabase } from './database/db'
import { getClickCaptureEnabled, getWorkflowMonitoringEnabled } from './database/repositories/settingsRepository'
import { APP_DISPLAY_NAME } from '@shared/constants'
import { flowPermissionState } from './flowPermission'
import { ACTION_CANCELLED_REASON, isSilentFailureReason } from './actions/actionExecutor'
import { DAYS_USED_WINDOW, summarizeBetaNumbers } from './betaNumbers'

/** How many recent control presses the report lists. */
const RECENT_ACTIONS = 15

interface ActionLogLine {
  at: string
  actionType: string
  ok: boolean
  reason?: string
}

/** Every line of logs/actions.jsonl (written by main/index.ts; trimmed
 *  there to the last ~500-1000 presses), oldest first. */
function readActionLog(): ActionLogLine[] | null {
  try {
    const file = join(app.getPath('userData'), 'logs', 'actions.jsonl')
    if (!existsSync(file)) return []
    return readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ActionLogLine)
  } catch {
    return null
  }
}

/** The last few presses, without control names: only when, what kind, and
 *  whether it worked. */
function recentActions(log: ActionLogLine[] | null): string[] {
  if (log === null) return ['  (could not read the action log)']
  return log
    .slice(-RECENT_ACTIONS)
    .map((entry) => `  ${entry.at}  ${entry.actionType}  ${entry.ok ? 'ok' : `failed: ${entry.reason ?? 'no reason'}`}`)
}

function betaNumbers(log: ActionLogLine[] | null): string[] {
  try {
    const db = getDatabase()
    const now = new Date()
    const since = now.getTime() - DAYS_USED_WINDOW * 24 * 60 * 60 * 1000
    const events = db
      .prepare('SELECT timestamp FROM workflow_events WHERE is_demo = 0 AND timestamp >= ?')
      .all(since) as Array<{ timestamp: number }>
    const earliest = db.prepare('SELECT MIN(timestamp) AS at FROM workflow_events WHERE is_demo = 0').get() as {
      at: number | null
    }
    const suggestions = db
      .prepare('SELECT status, created_at AS createdAt FROM suggestions WHERE is_demo = 0')
      .all() as Array<{ status: SuggestionStatus; createdAt: number }>
    return summarizeBetaNumbers({
      now,
      eventTimestamps: events.map((row) => row.timestamp),
      earliestEvent: earliest.at,
      suggestions,
      presses: log ?? [],
      isSilentFailure: isSilentFailureReason,
      cancelledReason: ACTION_CANCELLED_REASON
    })
  } catch {
    return ['Beta numbers: (could not read them)']
  }
}

function listenerLine(): string {
  const state = flowPermissionState()
  const listener = state.listening ? 'running' : state.listenerWanted ? 'NOT running' : 'not needed (Flow and Glide off)'
  return state.needed ? `${listener}, Accessibility ${state.accessibility ? 'allowed' : 'NOT allowed'}` : listener
}

function count(sql: string): number {
  try {
    return (getDatabase().prepare(sql).get() as { count: number }).count
  } catch {
    return -1
  }
}

/**
 * A plain-text summary for a beta bug report. Built only when the tester
 * asks for it, shown to them in full, and copied by them: Noma never sends
 * it anywhere. It holds versions, settings, counts and recent success /
 * failure lines; never shortcuts, workflow steps, app names, control names,
 * typed text or screenshots.
 */
export function buildDiagnosticsReport(glide: GlideState, touchCheckAt: number | null): string {
  const log = readActionLog()
  const recent = recentActions(log)
  const lines = [
    'Noma diagnostics (nothing here is sent automatically; read it before you paste it)',
    '',
    `${APP_DISPLAY_NAME} ${app.getVersion()}${app.isPackaged ? '' : ' (development build)'} · Electron ${process.versions.electron}`,
    `System: ${process.platform} ${release()} ${arch()}`,
    '',
    `Glide: ${glide.enabled ? 'on' : 'off'}, ${glide.zoneCount} zones, ${
      glide.touchpads === null ? 'touchpad not checked yet' : `${glide.touchpads} precision touchpad(s)`
    }${glide.platformSupported ? '' : ', not supported on this OS'}`,
    `Glide problem: ${glide.error ?? 'none'}`,
    `Touch check: ${touchCheckAt ? new Date(touchCheckAt).toISOString() : 'never run'}`,
    '',
    `Flow learning: ${getWorkflowMonitoringEnabled() ? 'on' : 'off'}, button clicks: ${getClickCaptureEnabled() ? 'on' : 'off'}`,
    `Input listener: ${listenerLine()}`,
    `Suggestions waiting: ${count("SELECT COUNT(*) AS count FROM suggestions WHERE status = 'pending'")}`,
    `Saved workflows: ${count("SELECT COUNT(*) AS count FROM macros WHERE trigger = 'flow-control'")}`,
    `Apps with controls: ${count('SELECT COUNT(*) AS count FROM profiles')}`,
    '',
    ...betaNumbers(log),
    '',
    `Last ${RECENT_ACTIONS} control presses (time, kind, result):`,
    ...(recent.length ? recent : ['  none yet'])
  ]
  return lines.join('\n')
}
