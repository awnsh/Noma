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
