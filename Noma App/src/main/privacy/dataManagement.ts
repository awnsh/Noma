import { getDatabase } from '../database/db'
import { seedDefaultProfiles } from '../database/seed'

/**
 * Privacy & data management (Settings page — this phase's section 13,
 * docs/privacy-and-legal.md's "right to inspect and delete"). Two distinct,
 * deliberately different-scoped actions:
 *
 * - clearLearningData: only what Flow observed and suggested. Your own
 *   configuration (profiles, controls, macros) is not learning data — it's
 *   choices you made, so accepting a suggestion and then clearing learning
 *   data does not undo the control it configured.
 * - deleteAllData: everything, back to a fresh install. Irreversible.
 */

/** Deletes every workflow_event and suggestion — the full observation/
 *  suggestion history, across every application, not just today's. Never
 *  touches applications, profiles, controls, or macros. */
export function clearLearningData(): void {
  const db = getDatabase()
  const run = db.transaction(() => {
    db.prepare('DELETE FROM workflow_events').run()
    db.prepare('DELETE FROM suggestions').run()
  })
  run()
}

/**
 * Full factory reset: wipes every table Flow writes to, then re-seeds the
 * default profiles — the exact state a fresh install starts in. `settings`
 * is included, so workflow monitoring reverts to its off-by-default state
 * (the caller is still responsible for stopping the live capture hook if
 * it was running — that's a runtime concern, not a data one, so it stays
 * in the IPC handler alongside the other services it already coordinates).
 */
export function deleteAllData(): void {
  const db = getDatabase()
  const run = db.transaction(() => {
    db.prepare('DELETE FROM workflow_events').run()
    db.prepare('DELETE FROM suggestions').run()
    db.prepare('DELETE FROM macros').run()
    db.prepare('DELETE FROM modules').run()
    // Cascades to profiles and controls (ON DELETE CASCADE, foreign_keys=ON).
    db.prepare('DELETE FROM applications').run()
    db.prepare('DELETE FROM settings').run()
  })
  run()
  seedDefaultProfiles(db)
}
