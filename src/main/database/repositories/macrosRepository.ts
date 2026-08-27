import { randomUUID } from 'crypto'
import type { Macro, MacroStep } from '@shared/types'
import { getDatabase } from '../db'

interface MacroRow {
  id: string
  name: string
  application_id: string | null
  trigger: string
  actions: string
  delay_ms: number
  enabled: number
}

function rowToMacro(row: MacroRow): Macro {
  return {
    id: row.id,
    name: row.name,
    applicationId: row.application_id ?? undefined,
    trigger: row.trigger,
    actions: JSON.parse(row.actions) as MacroStep[],
    delayMs: row.delay_ms,
    enabled: row.enabled === 1
  }
}

export function getMacroById(id: string): Macro | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM macros WHERE id = ?').get(id) as MacroRow | undefined
  return row ? rowToMacro(row) : null
}

/** All macros, newest first — used by the Control Mapping Editor's macro
 *  picker (and, later, the Macro Studio's list view). */
export function getAllMacros(): Macro[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM macros ORDER BY created_at DESC').all() as MacroRow[]
  return rows.map(rowToMacro)
}

export function createMacro(input: Omit<Macro, 'id'>): Macro {
  const db = getDatabase()
  const macro: Macro = { id: randomUUID(), ...input }

  db.prepare(
    `INSERT INTO macros (id, name, application_id, trigger, actions, delay_ms, enabled)
     VALUES (@id, @name, @applicationId, @trigger, @actions, @delayMs, @enabled)`
  ).run({
    id: macro.id,
    name: macro.name,
    applicationId: macro.applicationId ?? null,
    trigger: macro.trigger,
    actions: JSON.stringify(macro.actions),
    delayMs: macro.delayMs,
    enabled: macro.enabled ? 1 : 0
  })

  return macro
}

/**
 * Overwrites the given fields of an existing macro and returns the updated
 * row, or null if no macro has that id — the Macro Studio's Save button for
 * an already-created macro (createMacro is only for a brand-new one).
 */
export function updateMacro(
  id: string,
  updates: { name?: string; actions?: MacroStep[]; enabled?: boolean; applicationId?: string }
): Macro | null {
  const existing = getMacroById(id)
  if (!existing) return null

  const merged: Macro = {
    ...existing,
    name: updates.name ?? existing.name,
    actions: updates.actions ?? existing.actions,
    enabled: updates.enabled ?? existing.enabled,
    applicationId: updates.applicationId ?? existing.applicationId
  }

  getDatabase()
    .prepare(
      `UPDATE macros SET name = @name, application_id = @applicationId, actions = @actions, enabled = @enabled
       WHERE id = @id`
    )
    .run({
      id,
      name: merged.name,
      applicationId: merged.applicationId ?? null,
      actions: JSON.stringify(merged.actions),
      enabled: merged.enabled ? 1 : 0
    })

  return merged
}

/** Deletes a macro outright. Returns whether a row actually existed to
 *  delete. Any control still pointing at this macro id will fail closed
 *  the next time it's pressed ("Macro not found") — the same fail path
 *  already covered by actionExecutor.test.ts — rather than silently doing
 *  nothing; see getControlsReferencingMacro for warning the user first. */
export function deleteMacro(id: string): boolean {
  const result = getDatabase().prepare('DELETE FROM macros WHERE id = ?').run(id)
  return result.changes > 0
}

/** Copies a macro under a new id, so editing the copy can never affect the
 *  original or any control currently assigned to it. */
export function duplicateMacro(id: string): Macro | null {
  const source = getMacroById(id)
  if (!source) return null
  return createMacro({
    name: `${source.name} copy`,
    applicationId: source.applicationId,
    trigger: source.trigger,
    actions: source.actions,
    delayMs: source.delayMs,
    enabled: source.enabled
  })
}
