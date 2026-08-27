import type { Application } from '@shared/types'
import { getDatabase } from '../db'

interface ApplicationRow {
  id: string
  name: string
  process_name: string
  icon: string | null
}

function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    name: row.name,
    processName: row.process_name,
    icon: row.icon ?? undefined
  }
}

/** Every known application (seeded, or discovered via a profile created
 *  from an accepted suggestion) — used by the Macro Studio's "assign to
 *  control" and launch-application pickers. */
export function getAllApplications(): Application[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT id, name, process_name, icon FROM applications ORDER BY name').all() as ApplicationRow[]
  return rows.map(rowToApplication)
}

export function getApplicationById(id: string): Application | null {
  const db = getDatabase()
  const row = db.prepare('SELECT id, name, process_name, icon FROM applications WHERE id = ?').get(id) as
    | ApplicationRow
    | undefined
  return row ? rowToApplication(row) : null
}

/** Inserts an application row if it doesn't already exist. Deliberately
 *  DO NOTHING on conflict rather than overwriting — a seeded or
 *  user-chosen display name (e.g. "Google Chrome") shouldn't be clobbered
 *  by a later live-detection re-insert carrying the raw process name (e.g.
 *  "chrome"). Required before a profile can be created for this
 *  application at all — `profiles.application_id` has a foreign key to
 *  this table. */
export function upsertApplication(application: Application): void {
  getDatabase()
    .prepare(
      `INSERT INTO applications (id, name, process_name, icon)
       VALUES (@id, @name, @processName, @icon)
       ON CONFLICT(id) DO NOTHING`
    )
    .run({
      id: application.id,
      name: application.name,
      processName: application.processName,
      icon: application.icon ?? null
    })
}
