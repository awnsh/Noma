import { randomUUID } from 'crypto'
import type { Macro } from '@shared/types'
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
    actions: JSON.parse(row.actions) as string[],
    delayMs: row.delay_ms,
    enabled: row.enabled === 1
  }
}

export function getMacroById(id: string): Macro | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM macros WHERE id = ?').get(id) as MacroRow | undefined
  return row ? rowToMacro(row) : null
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
