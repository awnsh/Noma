import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MacroStep } from '@shared/types'
import { __setDatabaseForTesting, runMigrations, getDatabase } from '../db'
import { DEMO_MACRO_TRIGGER, LEARNED_MACRO_TRIGGER } from '@shared/constants'
import {
  createMacro,
  deleteLearnedMacroIfOrphaned,
  deleteMacro,
  duplicateMacro,
  getAllMacros,
  getMacroById,
  getMacroReferences,
  getMacrosReferencingMacro,
  stripMacroReferences,
  updateMacro
} from './macrosRepository'
import { assignControlAction } from './controlsRepository'

const COPY_PASTE: MacroStep[] = [
  { type: 'shortcut', keys: ['Control', 'C'] },
  { type: 'shortcut', keys: ['Control', 'V'] }
]

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('createMacro', () => {
  it('persists a macro and returns it with a generated id', () => {
    const macro = createMacro({
      name: 'Control+C → Control+V',
      applicationId: 'code',
      trigger: 'flow-control',
      actions: COPY_PASTE,
      delayMs: 0,
      enabled: true
    })

    expect(macro.id).toBeTruthy()

    const row = getDatabase().prepare('SELECT * FROM macros WHERE id = ?').get(macro.id) as {
      name: string
      application_id: string
      actions: string
      enabled: number
    }
    expect(row.name).toBe('Control+C → Control+V')
    expect(row.application_id).toBe('code')
    expect(JSON.parse(row.actions)).toEqual(COPY_PASTE)
    expect(row.enabled).toBe(1)
  })
})

describe('getAllMacros', () => {
  it('returns an empty list when none exist', () => {
    expect(getAllMacros()).toEqual([])
  })

  it('returns every created macro', () => {
    createMacro({
      name: 'First',
      trigger: 'flow-control',
      actions: [{ type: 'shortcut', keys: ['Control', 'C'] }],
      delayMs: 0,
      enabled: true
    })
    createMacro({
      name: 'Second',
      trigger: 'flow-control',
      actions: [{ type: 'shortcut', keys: ['Control', 'V'] }],
      delayMs: 0,
      enabled: true
    })

    const macros = getAllMacros()
    expect(macros).toHaveLength(2)
    expect(macros.map((m) => m.name).sort()).toEqual(['First', 'Second'])
  })
})

describe('updateMacro', () => {
  it('overwrites name/actions/enabled and persists the change', () => {
    const macro = createMacro({
      name: 'Original',
      trigger: 'manual',
      actions: [{ type: 'shortcut', keys: ['Control', 'C'] }],
      delayMs: 0,
      enabled: true
    })

    const updated = updateMacro(macro.id, { name: 'Renamed', actions: COPY_PASTE, enabled: false })

    expect(updated?.name).toBe('Renamed')
    expect(updated?.actions).toEqual(COPY_PASTE)
    expect(updated?.enabled).toBe(false)
    expect(getMacroById(macro.id)).toEqual(updated)
  })

  it('returns null for a macro id that does not exist', () => {
    expect(updateMacro('does-not-exist', { name: 'X' })).toBeNull()
  })
})

describe('deleteMacro', () => {
  it('removes the macro and reports true', () => {
    const macro = createMacro({
      name: 'Temp',
      trigger: 'manual',
      actions: [],
      delayMs: 0,
      enabled: true
    })
    expect(deleteMacro(macro.id)).toBe(true)
    expect(getMacroById(macro.id)).toBeNull()
  })

  it('returns false for a macro id that does not exist', () => {
    expect(deleteMacro('does-not-exist')).toBe(false)
  })
})

describe('duplicateMacro', () => {
  it('creates a new macro with the same steps and a distinct id', () => {
    const original = createMacro({
      name: 'Copy Paste',
      trigger: 'manual',
      actions: COPY_PASTE,
      delayMs: 0,
      enabled: true
    })

    const copy = duplicateMacro(original.id)

    expect(copy).not.toBeNull()
    expect(copy?.id).not.toBe(original.id)
    expect(copy?.name).toBe('Copy Paste copy')
    expect(copy?.actions).toEqual(COPY_PASTE)
    expect(getAllMacros()).toHaveLength(2)
  })

  it('returns null for a macro id that does not exist', () => {
    expect(duplicateMacro('does-not-exist')).toBeNull()
  })
})

function makeMacro(name: string, trigger: string, actions: MacroStep[] = COPY_PASTE): string {
  return createMacro({ name, trigger, actions, delayMs: 0, enabled: true }).id
}

/** One application with a single-slot profile, for reference tests. */
function seedControl(): void {
  const db = getDatabase()
  db.prepare("INSERT INTO applications (id, name, process_name) VALUES ('code', 'Visual Studio Code', 'Code.exe')").run()
  db.prepare("INSERT INTO profiles (id, application_id, name) VALUES ('code-default', 'code', 'Developer')").run()
  db.prepare(
    `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
     VALUES ('ctrl-1', 'code-default', 1, 'RUN', 'shortcut', '{"type":"shortcut","keys":["F5"]}')`
  ).run()
}

describe('updateMacro; delayMs', () => {
  it('changes delayMs and persists it', () => {
    const id = makeMacro('Paced', 'manual')
    expect(updateMacro(id, { delayMs: 250 })?.delayMs).toBe(250)
    expect(getMacroById(id)?.delayMs).toBe(250)
  })

  it('fails closed on a negative or non-finite delay, writing nothing', () => {
    const id = makeMacro('Paced', 'manual')
    expect(updateMacro(id, { name: 'Renamed', delayMs: -1 })).toBeNull()
    expect(updateMacro(id, { delayMs: Number.NaN })).toBeNull()
    expect(getMacroById(id)).toMatchObject({ name: 'Paced', delayMs: 0 })
  })
})

describe('duplicateMacro; trigger', () => {
  it('makes a copy of a learned or demo workflow the user’s own (manual)', () => {
    for (const trigger of [LEARNED_MACRO_TRIGGER, DEMO_MACRO_TRIGGER]) {
      const copy = duplicateMacro(makeMacro('Learned', trigger))
      expect(copy?.trigger).toBe('manual')
      expect(getMacroById(copy!.id)?.trigger).toBe('manual')
    }
  })
})

describe('rowToMacro; corrupt actions', () => {
  it('loads a macro with unreadable actions as disabled with no steps, without breaking the list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const good = makeMacro('Good', 'manual')
    const bad = makeMacro('Bad', 'manual')
    const notArray = makeMacro('NotArray', 'manual')
    getDatabase().prepare("UPDATE macros SET actions = '{oops' WHERE id = ?").run(bad)
    getDatabase().prepare('UPDATE macros SET actions = \'{"type":"shortcut"}\' WHERE id = ?').run(notArray)

    const all = getAllMacros()
    expect(all).toHaveLength(3)
    expect(all.find((m) => m.id === good)).toMatchObject({ actions: COPY_PASTE, enabled: true })
    expect(getMacroById(bad)).toMatchObject({ actions: [], enabled: false })
    expect(getMacroById(notArray)).toMatchObject({ actions: [], enabled: false })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('getMacrosReferencingMacro / getMacroReferences', () => {
  it('finds macros with a direct macro step pointing at it, not unrelated or self references', () => {
    const target = makeMacro('Target', LEARNED_MACRO_TRIGGER)
    const caller = makeMacro('Caller', 'manual', [{ type: 'macro', macroId: target }])
    makeMacro('Unrelated', 'manual', [{ type: 'macro', macroId: 'someone-else' }])
    // Mentions the id only inside a shortcut key: the prefilter matches, the parse must not.
    makeMacro('Lookalike', 'manual', [{ type: 'shortcut', keys: [target] }])
    updateMacro(target, { actions: [{ type: 'macro', macroId: target }] })

    expect(getMacrosReferencingMacro(target).map((m) => m.id)).toEqual([caller])
  })

  it('reports both controls and macros that reference a macro', () => {
    seedControl()
    const target = makeMacro('Target', 'manual')
    const caller = makeMacro('Caller', 'manual', [{ type: 'macro', macroId: target }])
    assignControlAction('code-default', 1, 'TARGET', { type: 'macro', macroId: target })

    const refs = getMacroReferences(target)
    expect(refs.controls.map((c) => c.controlId)).toEqual(['ctrl-1'])
    expect(refs.macros).toEqual([{ macroId: caller, name: 'Caller' }])
  })

  it('stripMacroReferences removes only the steps calling that macro', () => {
    const target = makeMacro('Target', 'manual')
    const caller = makeMacro('Caller', 'manual', [
      { type: 'shortcut', keys: ['Control', 'C'] },
      { type: 'macro', macroId: target },
      { type: 'macro', macroId: 'other' }
    ])
    expect(stripMacroReferences(target)).toEqual([caller])
    expect(getMacroById(caller)?.actions).toEqual([
      { type: 'shortcut', keys: ['Control', 'C'] },
      { type: 'macro', macroId: 'other' }
    ])
  })
})

describe('deleteLearnedMacroIfOrphaned', () => {
  it('deletes an unreferenced learned or demo macro', () => {
    const learned = makeMacro('Learned', LEARNED_MACRO_TRIGGER)
    const demo = makeMacro('Demo', DEMO_MACRO_TRIGGER)
    expect(deleteLearnedMacroIfOrphaned(learned)).toEqual([learned])
    expect(deleteLearnedMacroIfOrphaned(demo)).toEqual([demo])
    expect(getAllMacros()).toEqual([])
  })

  it('never deletes a user-authored macro, even unreferenced', () => {
    const manual = makeMacro('Mine', 'manual')
    expect(deleteLearnedMacroIfOrphaned(manual)).toEqual([])
    expect(getMacroById(manual)).not.toBeNull()
  })

  it('keeps a learned macro that a control or another macro still uses', () => {
    seedControl()
    const onControl = makeMacro('On control', LEARNED_MACRO_TRIGGER)
    assignControlAction('code-default', 1, 'X', { type: 'macro', macroId: onControl })
    const called = makeMacro('Called', LEARNED_MACRO_TRIGGER)
    makeMacro('Caller', 'manual', [{ type: 'macro', macroId: called }])

    expect(deleteLearnedMacroIfOrphaned(onControl)).toEqual([])
    expect(deleteLearnedMacroIfOrphaned(called)).toEqual([])
    expect(getAllMacros()).toHaveLength(3)
  })

  it('cascades to learned macros only the deleted one called, never to manual ones', () => {
    const inner = makeMacro('Inner', LEARNED_MACRO_TRIGGER)
    const manualInner = makeMacro('Manual inner', 'manual')
    const outer = makeMacro('Outer', LEARNED_MACRO_TRIGGER, [
      { type: 'macro', macroId: inner },
      { type: 'macro', macroId: manualInner }
    ])
    expect(deleteLearnedMacroIfOrphaned(outer)).toEqual([outer, inner])
    expect(getAllMacros().map((m) => m.id)).toEqual([manualInner])
  })
})
