import { randomUUID } from 'crypto'
import type { Macro, MacroStep } from '@shared/types'
import { DEMO_MACRO_TRIGGER, LEARNED_MACRO_TRIGGER } from '@shared/constants'
import { getDatabase } from '../db'
import { getControlsReferencingMacro } from './controlsRepository'

/** `Macro.trigger` of a macro the user authored (Macro Studio's New, or a
 *  Duplicate of any macro). Never deleted automatically: only learned/demo
 *  macros are Noma's to clean up. */
export const MANUAL_MACRO_TRIGGER = 'manual'

/** Whether a macro was saved by Noma from a Flow or Demo suggestion (as
 *  opposed to authored by the user): the only macros removeLearnedWorkflow
 *  may remove and the only ones deleteLearnedMacroIfOrphaned may collect. */
export function isLearnedMacroTrigger(trigger: string): boolean {
  return trigger === LEARNED_MACRO_TRIGGER || trigger === DEMO_MACRO_TRIGGER
}

interface MacroRow {
  id: string
  name: string
  application_id: string | null
  trigger: string
  actions: string
  delay_ms: number
  enabled: number
}

/** Parses a row's actions JSON. Returns null (never throws) when the column
 *  is corrupt or isn't an array, so callers can fail closed per row. */
function parseActions(raw: string): MacroStep[] | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MacroStep[]) : null
  } catch {
    return null
  }
}

/** A corrupt actions column must never take down the whole macro list (one
 *  bad row would otherwise make getAllMacros throw for every macro). Such a
 *  macro comes back with no steps and disabled, failing closed: it still
 *  shows up (so the user can see, fix or delete it) but can't run. */
function rowToMacro(row: MacroRow): Macro {
  const actions = parseActions(row.actions)
  if (!actions) {
    console.warn(`[macros] Macro ${row.id} has unreadable actions; loading it disabled with no steps.`)
  }
  return {
    id: row.id,
    name: row.name,
    applicationId: row.application_id ?? undefined,
    trigger: row.trigger,
    actions: actions ?? [],
    delayMs: row.delay_ms,
    enabled: actions ? row.enabled === 1 : false
  }
}

export function getMacroById(id: string): Macro | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM macros WHERE id = ?').get(id) as MacroRow | undefined
  return row ? rowToMacro(row) : null
}

/** All macros, newest first; used by the Control Mapping Editor's macro
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
 * row, or null if no macro has that id: the Macro Studio's Save button for
 * an already-created macro (createMacro is only for a brand-new one).
 * `delayMs` must be a finite, non-negative number; anything else fails
 * closed (null, nothing written). `trigger` is deliberately not editable
 * here: it's what classifies a macro as learned/demo/manual, and so what
 * decides whether Noma may ever delete it on its own.
 */
export function updateMacro(
  id: string,
  updates: { name?: string; actions?: MacroStep[]; enabled?: boolean; applicationId?: string; delayMs?: number }
): Macro | null {
  const existing = getMacroById(id)
  if (!existing) return null
  if (updates.delayMs !== undefined && !(Number.isFinite(updates.delayMs) && updates.delayMs >= 0)) return null

  const merged: Macro = {
    ...existing,
    name: updates.name ?? existing.name,
    actions: updates.actions ?? existing.actions,
    enabled: updates.enabled ?? existing.enabled,
    applicationId: updates.applicationId ?? existing.applicationId,
    delayMs: updates.delayMs ?? existing.delayMs
  }

  getDatabase()
    .prepare(
      `UPDATE macros SET name = @name, application_id = @applicationId, actions = @actions, enabled = @enabled,
              delay_ms = @delayMs
       WHERE id = @id`
    )
    .run({
      id,
      name: merged.name,
      applicationId: merged.applicationId ?? null,
      actions: JSON.stringify(merged.actions),
      enabled: merged.enabled ? 1 : 0,
      delayMs: merged.delayMs
    })

  return merged
}

/** Deletes a macro outright. Returns whether a row actually existed to
 *  delete. Any control or macro step still pointing at this macro id will
 *  fail closed the next time it runs ("Macro not found"): the same fail
 *  path already covered by actionExecutor.test.ts; rather than silently
 *  doing nothing; see getMacroReferences for warning the user first. */
export function deleteMacro(id: string): boolean {
  const result = getDatabase().prepare('DELETE FROM macros WHERE id = ?').run(id)
  return result.changes > 0
}

/** Copies a macro under a new id, so editing the copy can never affect the
 *  original or any control currently assigned to it. The copy is always the
 *  user's own ('manual'), even when the source was learned or demo: a copy
 *  keeping the source's trigger would stay classified as Noma's, so the demo
 *  reset or learned-workflow cleanup could later delete the user's copy. */
export function duplicateMacro(id: string): Macro | null {
  const source = getMacroById(id)
  if (!source) return null
  return createMacro({
    name: `${source.name} copy`,
    applicationId: source.applicationId,
    trigger: MANUAL_MACRO_TRIGGER,
    actions: source.actions,
    delayMs: source.delayMs,
    enabled: source.enabled
  })
}

/** Every other macro with a direct `{type: 'macro', macroId}` step pointing
 *  at this one (not transitive: a macro that only reaches it through a
 *  third macro isn't listed, since removing the direct step is enough to
 *  stop the chain dangling). A macro calling itself isn't listed: deleting
 *  it removes that reference too. `instr` is only a cheap prefilter; the
 *  parsed steps decide, and a row with corrupt actions JSON references
 *  nothing (rowToMacro already loads it with no steps). */
export function getMacrosReferencingMacro(macroId: string): Macro[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM macros WHERE id != ? AND instr(actions, ?) > 0 ORDER BY created_at DESC')
    .all(macroId, macroId) as MacroRow[]
  return rows
    .map(rowToMacro)
    .filter((macro) => macro.actions.some((step) => step.type === 'macro' && step.macroId === macroId))
}

/** Everything that would dangle if this macro were deleted: controls
 *  assigned it, and other macros calling it as a step. Backs the Macro
 *  Studio's delete warning, which until now only knew about controls. */
export function getMacroReferences(macroId: string): {
  controls: ReturnType<typeof getControlsReferencingMacro>
  macros: Array<{ macroId: string; name: string }>
} {
  return {
    controls: getControlsReferencingMacro(macroId),
    macros: getMacrosReferencingMacro(macroId).map((macro) => ({ macroId: macro.id, name: macro.name }))
  }
}

/** Removes every `{type: 'macro', macroId}` step pointing at this macro from
 *  every other macro, so deleting it can't leave a dangling step. Returns
 *  the ids of the macros that changed. Callers deleting the macro should run
 *  this in the same transaction. */
export function stripMacroReferences(macroId: string): string[] {
  const changed: string[] = []
  for (const macro of getMacrosReferencingMacro(macroId)) {
    const actions = macro.actions.filter((step) => !(step.type === 'macro' && step.macroId === macroId))
    if (updateMacro(macro.id, { actions })) changed.push(macro.id)
  }
  return changed
}

/**
 * Garbage-collects a learned/demo macro once nothing uses it any more: a
 * workflow saved from a suggestion exists only to sit on a control, so
 * when its last control is overwritten (and no other macro calls it) it
 * would otherwise linger forever. Never touches a user-authored macro
 * (anything whose trigger isn't learned/demo), and does nothing while any
 * control or macro still references it. Cascades to learned macros the
 * deleted one itself called, which may have just become orphaned too.
 * Returns the ids actually deleted. Run it inside the caller's transaction,
 * after the overwrite has been written.
 */
export function deleteLearnedMacroIfOrphaned(macroId: string, visited: Set<string> = new Set()): string[] {
  if (visited.has(macroId)) return []
  visited.add(macroId)

  const macro = getMacroById(macroId)
  if (!macro || !isLearnedMacroTrigger(macro.trigger)) return []
  if (getControlsReferencingMacro(macroId).length > 0) return []
  if (getMacrosReferencingMacro(macroId).length > 0) return []

  if (!deleteMacro(macroId)) return []
  const deleted = [macroId]
  for (const step of macro.actions) {
    if (step.type === 'macro') deleted.push(...deleteLearnedMacroIfOrphaned(step.macroId, visited))
  }
  return deleted
}
