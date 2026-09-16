import type { Application } from '@shared/types'
import { getDatabase } from '../db'

interface ApplicationRow {
  id: string
  name: string
  process_name: string
  icon: string | null
  executable_path: string | null
}

function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    name: row.name,
    processName: row.process_name,
    icon: row.icon ?? undefined,
    executablePath: row.executable_path ?? undefined
  }
}

/** Every known application (seeded, or discovered via a profile created
 *  from an accepted suggestion) — used by the Macro Studio's "assign to
 *  control" and launch-application pickers. */
export function getAllApplications(): Application[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT id, name, process_name, icon, executable_path FROM applications ORDER BY name')
    .all() as ApplicationRow[]
  return rows.map(rowToApplication)
}

export function getApplicationById(id: string): Application | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT id, name, process_name, icon, executable_path FROM applications WHERE id = ?')
    .get(id) as ApplicationRow | undefined
  return row ? rowToApplication(row) : null
}

/**
 * Inserts an application row if it doesn't already exist. On conflict,
 * deliberately leaves `name`/`process_name`/`icon` untouched — a seeded or
 * user-chosen display name (e.g. "Google Chrome") shouldn't be clobbered by
 * a later live-detection re-insert carrying the raw process name (e.g.
 * "chrome"). Required before a profile can be created for this application
 * at all — `profiles.application_id` has a foreign key to this table.
 *
 * `executable_path` is the one exception to "on conflict, do nothing": it's
 * backfilled with `COALESCE`, keeping whatever's already on file if the
 * incoming value is null, but filling it in the first time a real path
 * becomes known. Without this, every app in `SEED_APPLICATIONS` (seed.ts) —
 * including VS Code and Chrome, the two most likely to be the very first
 * thing a user opens — would have its `executable_path` permanently stuck
 * at NULL from the pre-seeded row with no path, since a plain `DO NOTHING`
 * would silently discard the real path the very first time the real
 * process is actually detected running. Real OS-icon extraction
 * (iconService.ts) needs that path, so this had to be an update, not an
 * insert-only guard.
 */
export function upsertApplication(application: Application): void {
  getDatabase()
    .prepare(
      `INSERT INTO applications (id, name, process_name, icon, executable_path)
       VALUES (@id, @name, @processName, @icon, @executablePath)
       ON CONFLICT(id) DO UPDATE SET
         executable_path = COALESCE(excluded.executable_path, applications.executable_path)`
    )
    .run({
      id: application.id,
      name: application.name,
      processName: application.processName,
      icon: application.icon ?? null,
      executablePath: application.executablePath ?? null
    })
}
