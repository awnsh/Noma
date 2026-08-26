import { randomUUID } from 'crypto'
import type { Macro } from '@shared/types'
import { getDatabase } from '../db'

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
