import type Database from 'better-sqlite3'
import type {
  ConfigCounts,
  ConfigImportMode,
  ConfigImportPreview,
  ControlAction,
  MacroStep
} from '@shared/types'
import {
  CONTROL_SLOTS,
  FLOW_ACTION_CATALOG,
  MAX_CONTROL_LABEL_LENGTH,
  SYSTEM_COMMAND_CATALOG
} from '@shared/constants'

/**
 * Export and import of the user's configuration: applications, profiles,
 * controls and macros. Never workflow_events or suggestions; those are
 * learning data, not choices the user made (docs/privacy-and-legal.md, and
 * the same line clearLearningData draws in privacy/dataManagement.ts).
 *
 * Import fails closed: the whole file is validated before anything is
 * read into the database, and the write happens in one transaction, so a
 * bad file changes nothing.
 */

export const CONFIG_FILE_FORMAT = 'noma-settings'
export const CONFIG_FILE_VERSION = 1
export const MAX_CONFIG_FILE_BYTES = 5 * 1024 * 1024

const MAX_RECORDS = 5000
const MAX_STRING = 500
const MAX_SHORTCUT_KEYS = 10
const MAX_MACRO_STEPS = 500
const MAX_DELAY_MS = 10 * 60 * 1000

export interface ConfigApplication {
  id: string
  name: string
  processName: string
  icon: string | null
}

export interface ConfigProfile {
  id: string
  applicationId: string
  name: string
  icon: string | null
  isActive: boolean
}

export interface ConfigControl {
  id: string
  profileId: string
  slot: number
  label: string
  action: ControlAction
}

export interface ConfigMacro {
  id: string
  name: string
  applicationId: string | null
  trigger: string
  actions: MacroStep[]
  delayMs: number
  enabled: boolean
}

export interface ConfigFile {
  format: typeof CONFIG_FILE_FORMAT
  version: typeof CONFIG_FILE_VERSION
  exportedAt: string
  appVersion: string
  applications: ConfigApplication[]
  profiles: ConfigProfile[]
  controls: ConfigControl[]
  macros: ConfigMacro[]
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Reads the current configuration into the file shape. The executable
 *  path is left out on purpose: it names the user's home folder, and live
 *  detection fills it back in on whichever computer imports the file. */
export function buildConfigExport(db: Database.Database, appVersion: string, now = new Date()): ConfigFile {
  const applications = (
    db.prepare('SELECT id, name, process_name, icon FROM applications ORDER BY id').all() as Array<{
      id: string
      name: string
      process_name: string
      icon: string | null
    }>
  ).map((row) => ({ id: row.id, name: row.name, processName: row.process_name, icon: row.icon }))

  const profiles = (
    db.prepare('SELECT id, application_id, name, icon, is_active FROM profiles ORDER BY created_at, id').all() as Array<{
      id: string
      application_id: string
      name: string
      icon: string | null
      is_active: number
    }>
  ).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    name: row.name,
    icon: row.icon,
    isActive: row.is_active === 1
  }))

  const controls = (
    db.prepare('SELECT id, profile_id, slot, label, action_payload FROM controls ORDER BY profile_id, slot').all() as Array<{
      id: string
      profile_id: string
      slot: number
      label: string
      action_payload: string
    }>
  ).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    slot: row.slot,
    label: row.label,
    action: JSON.parse(row.action_payload) as ControlAction
  }))

  const macros = (
    db.prepare('SELECT id, name, application_id, trigger, actions, delay_ms, enabled FROM macros ORDER BY created_at, id').all() as Array<{
      id: string
      name: string
      application_id: string | null
      trigger: string
      actions: string
      delay_ms: number
      enabled: number
    }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    applicationId: row.application_id,
    trigger: row.trigger,
    actions: JSON.parse(row.actions) as MacroStep[],
    delayMs: row.delay_ms,
    enabled: row.enabled === 1
  }))

  return {
    format: CONFIG_FILE_FORMAT,
    version: CONFIG_FILE_VERSION,
    exportedAt: now.toISOString(),
    appVersion,
    applications,
    profiles,
    controls,
    macros
  }
}

export function countConfig(config: Pick<ConfigFile, 'applications' | 'profiles' | 'controls' | 'macros'>): ConfigCounts {
  return {
    applications: config.applications.length,
    profiles: config.profiles.length,
    controls: config.controls.length,
    macros: config.macros.length
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ParseResult = { ok: true; config: ConfigFile } | { ok: false; reason: string }

class InvalidConfig extends Error {}

function fail(message: string): never {
  throw new InvalidConfig(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, where: string, { allowEmpty = false, max = MAX_STRING } = {}): string {
  if (typeof value !== 'string') fail(`${where} is not text.`)
  if (!allowEmpty && value.trim().length === 0) fail(`${where} is empty.`)
  if (value.length > max) fail(`${where} is too long.`)
  return value
}

function optionalStr(value: unknown, where: string): string | null {
  if (value === undefined || value === null) return null
  return str(value, where)
}

function bool(value: unknown, where: string): boolean {
  if (typeof value !== 'boolean') fail(`${where} is not true or false.`)
  return value
}

function int(value: unknown, where: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(`${where} is not a whole number between ${min} and ${max}.`)
  }
  return value
}

function list(value: unknown, where: string, max = MAX_RECORDS): unknown[] {
  if (!Array.isArray(value)) fail(`${where} is missing or not a list.`)
  if (value.length > max) fail(`${where} has too many entries.`)
  return value
}

function parseAction(value: unknown, where: string, allowDelay: boolean): MacroStep {
  if (!isRecord(value)) fail(`${where} is not an action.`)
  switch (value.type) {
    case 'none':
      return { type: 'none' }
    case 'shortcut': {
      const keys = list(value.keys, `${where}'s keys`, MAX_SHORTCUT_KEYS).map((key, i) =>
        str(key, `${where}'s key ${i + 1}`, { max: 40 })
      )
      if (keys.length === 0) fail(`${where} is a shortcut with no keys.`)
      return { type: 'shortcut', keys }
    }
    case 'macro':
      return { type: 'macro', macroId: str(value.macroId, `${where}'s macro`) }
    case 'launchApplication':
      return { type: 'launchApplication', applicationId: str(value.applicationId, `${where}'s app`) }
    case 'focusApplication':
      return { type: 'focusApplication', applicationId: str(value.applicationId, `${where}'s app`) }
    case 'systemCommand': {
      const command = str(value.command, `${where}'s command`)
      if (!SYSTEM_COMMAND_CATALOG.includes(command)) fail(`${where} uses an unknown system command.`)
      return { type: 'systemCommand', command }
    }
    case 'flowAction': {
      const action = str(value.action, `${where}'s action`)
      if (!FLOW_ACTION_CATALOG.includes(action)) fail(`${where} uses an unknown Noma action.`)
      return { type: 'flowAction', action }
    }
    case 'click': {
      const target = str(value.target, `${where}'s click target`)
      if (!/^(label|zone):/.test(target)) fail(`${where} has an unrecognised click target.`)
      const applicationId = optionalStr(value.applicationId, `${where}'s app`)
      return applicationId ? { type: 'click', target, applicationId } : { type: 'click', target }
    }
    case 'delay':
      if (!allowDelay) fail(`${where} is a pause, which only a macro step can be.`)
      return { type: 'delay', ms: int(value.ms, `${where}'s pause`, 0, MAX_DELAY_MS) }
    default:
      fail(`${where} has an unknown action type.`)
  }
}

function uniqueIds<T extends { id: string }>(items: T[], what: string): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) fail(`Two ${what} share the id "${item.id}".`)
    ids.add(item.id)
  }
  return ids
}

const TOP_LEVEL_KEYS = new Set([
  'format',
  'version',
  'exportedAt',
  'appVersion',
  'applications',
  'profiles',
  'controls',
  'macros'
])

/**
 * Parses and validates a settings file's text. Any problem rejects the
 * whole file with a plain reason; nothing is partially accepted.
 * Structural references (profile to app, control to profile) must resolve
 * inside the file. A control pointing at a macro that doesn't exist is
 * allowed, as it is in the database: running it reports the missing macro.
 */
export function parseConfigFile(text: string): ParseResult {
  try {
    if (Buffer.byteLength(text, 'utf8') > MAX_CONFIG_FILE_BYTES) fail('The file is too large to be a Noma settings file.')

    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      fail('The file is not valid JSON.')
    }
    if (!isRecord(raw) || raw.format !== CONFIG_FILE_FORMAT) fail('This is not a Noma settings file.')
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) fail('The file has no version.')
    if (raw.version > CONFIG_FILE_VERSION) fail('This file was exported by a newer version of Noma. Update Noma, then import it.')
    if (raw.version !== CONFIG_FILE_VERSION) fail(`Version ${raw.version} settings files aren't supported.`)
    for (const key of Object.keys(raw)) {
      if (!TOP_LEVEL_KEYS.has(key)) fail(`The file has an unexpected section, "${key}".`)
    }

    const applications = list(raw.applications, 'Applications').map((item, i): ConfigApplication => {
      const where = `Application ${i + 1}`
      if (!isRecord(item)) fail(`${where} is malformed.`)
      return {
        id: str(item.id, `${where}'s id`),
        name: str(item.name, `${where}'s name`),
        processName: str(item.processName, `${where}'s process name`),
        icon: optionalStr(item.icon, `${where}'s icon`)
      }
    })
    const applicationIds = uniqueIds(applications, 'applications')

    const profiles = list(raw.profiles, 'Profiles').map((item, i): ConfigProfile => {
      const where = `Profile ${i + 1}`
      if (!isRecord(item)) fail(`${where} is malformed.`)
      const profile = {
        id: str(item.id, `${where}'s id`),
        applicationId: str(item.applicationId, `${where}'s app`),
        name: str(item.name, `${where}'s name`),
        icon: optionalStr(item.icon, `${where}'s icon`),
        isActive: bool(item.isActive, `${where}'s active flag`)
      }
      if (!applicationIds.has(profile.applicationId)) fail(`${where} belongs to an app that isn't in the file.`)
      return profile
    })
    const profileIds = uniqueIds(profiles, 'profiles')

    const slotKeys = new Set<string>()
    const controls = list(raw.controls, 'Controls').map((item, i): ConfigControl => {
      const where = `Control ${i + 1}`
      if (!isRecord(item)) fail(`${where} is malformed.`)
      const control = {
        id: str(item.id, `${where}'s id`),
        profileId: str(item.profileId, `${where}'s profile`),
        slot: int(item.slot, `${where}'s slot`, CONTROL_SLOTS[0], CONTROL_SLOTS[CONTROL_SLOTS.length - 1]),
        label: str(item.label, `${where}'s label`, { allowEmpty: true, max: MAX_CONTROL_LABEL_LENGTH }),
        action: parseAction(item.action, `${where}'s action`, false) as ControlAction
      }
      if (!profileIds.has(control.profileId)) fail(`${where} belongs to a profile that isn't in the file.`)
      const slotKey = `${control.profileId}\u0000${control.slot}`
      if (slotKeys.has(slotKey)) fail(`${where} uses a slot another control in the same profile already has.`)
      slotKeys.add(slotKey)
      return control
    })
    uniqueIds(controls, 'controls')

    const macros = list(raw.macros, 'Macros').map((item, i): ConfigMacro => {
      const where = `Macro ${i + 1}`
      if (!isRecord(item)) fail(`${where} is malformed.`)
      return {
        id: str(item.id, `${where}'s id`),
        name: str(item.name, `${where}'s name`),
        applicationId: optionalStr(item.applicationId, `${where}'s app`),
        trigger: str(item.trigger, `${where}'s trigger`),
        actions: list(item.actions, `${where}'s steps`, MAX_MACRO_STEPS).map((step, j) =>
          parseAction(step, `${where}, step ${j + 1}`, true)
        ),
        delayMs: int(item.delayMs, `${where}'s delay`, 0, MAX_DELAY_MS),
        enabled: bool(item.enabled, `${where}'s enabled flag`)
      }
    })
    uniqueIds(macros, 'macros')

    return {
      ok: true,
      config: {
        format: CONFIG_FILE_FORMAT,
        version: CONFIG_FILE_VERSION,
        exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt.slice(0, 64) : '',
        appVersion: typeof raw.appVersion === 'string' ? raw.appVersion.slice(0, 64) : '',
        applications,
        profiles,
        controls,
        macros
      }
    }
  } catch (error) {
    if (error instanceof InvalidConfig) return { ok: false, reason: error.message }
    return { ok: false, reason: 'The file could not be read as Noma settings.' }
  }
}

// ---------------------------------------------------------------------------
// Preview and apply
// ---------------------------------------------------------------------------

interface ImportPlan {
  /** Existing profile ids that will be deleted (their controls cascade). */
  profileIdsToDelete: Set<string>
  /** Existing control ids deleted outside those profiles (an id clash). */
  strayControlIdsToDelete: Set<string>
  /** Existing macro ids that will be deleted before the file's are written. */
  macroIdsToDelete: Set<string>
}

function ids(db: Database.Database, sql: string, ...params: unknown[]): Set<string> {
  return new Set((db.prepare(sql).all(...params) as Array<{ id: string }>).map((row) => row.id))
}

/**
 * Which existing rows an import removes. Merge: every app the file has a
 * profile for gets exactly the file's profile(s), so its old ones go; apps
 * the file doesn't mention keep theirs; macros are updated by id. Replace:
 * every profile, control and macro goes first.
 */
function planImport(db: Database.Database, config: ConfigFile, mode: ConfigImportMode): ImportPlan {
  if (mode === 'replace') {
    return {
      profileIdsToDelete: ids(db, 'SELECT id FROM profiles'),
      strayControlIdsToDelete: new Set(),
      macroIdsToDelete: ids(db, 'SELECT id FROM macros')
    }
  }

  const profileIdsToDelete = new Set<string>()
  const fileApps = new Set(config.profiles.map((profile) => profile.applicationId))
  const existingProfiles = db.prepare('SELECT id, application_id FROM profiles').all() as Array<{
    id: string
    application_id: string
  }>
  const fileProfileIds = new Set(config.profiles.map((profile) => profile.id))
  for (const profile of existingProfiles) {
    if (fileApps.has(profile.application_id) || fileProfileIds.has(profile.id)) profileIdsToDelete.add(profile.id)
  }

  const strayControlIdsToDelete = new Set<string>()
  const existingControls = db.prepare('SELECT id, profile_id FROM controls').all() as Array<{ id: string; profile_id: string }>
  const fileControlIds = new Set(config.controls.map((control) => control.id))
  for (const control of existingControls) {
    if (fileControlIds.has(control.id) && !profileIdsToDelete.has(control.profile_id)) strayControlIdsToDelete.add(control.id)
  }

  const existingMacros = ids(db, 'SELECT id FROM macros')
  const macroIdsToDelete = new Set(config.macros.map((macro) => macro.id).filter((id) => existingMacros.has(id)))

  return { profileIdsToDelete, strayControlIdsToDelete, macroIdsToDelete }
}

export function previewConfigImport(db: Database.Database, config: ConfigFile, mode: ConfigImportMode): ConfigImportPreview {
  const plan = planImport(db, config, mode)

  const deletedProfileApps = new Set<string>()
  if (plan.profileIdsToDelete.size > 0) {
    const rows = db.prepare('SELECT id, application_id FROM profiles').all() as Array<{ id: string; application_id: string }>
    for (const row of rows) if (plan.profileIdsToDelete.has(row.id)) deletedProfileApps.add(row.application_id)
  }
  // A file profile "replaces" when its app loses a profile to make room for
  // it; otherwise it's new. Whatever's deleted beyond that is "removed".
  const replacedProfiles = config.profiles.filter((profile) => deletedProfileApps.has(profile.applicationId)).length
  const removedProfiles = Math.max(0, plan.profileIdsToDelete.size - replacedProfiles)

  let removedControls = plan.strayControlIdsToDelete.size
  if (plan.profileIdsToDelete.size > 0) {
    const rows = db.prepare('SELECT profile_id FROM controls').all() as Array<{ profile_id: string }>
    removedControls += rows.filter((row) => plan.profileIdsToDelete.has(row.profile_id)).length
  }

  const fileMacroIds = new Set(config.macros.map((macro) => macro.id))
  const replacedMacros = [...plan.macroIdsToDelete].filter((id) => fileMacroIds.has(id)).length

  return {
    profiles: { added: config.profiles.length - replacedProfiles, replaced: replacedProfiles, removed: removedProfiles },
    controls: { added: config.controls.length, removed: removedControls },
    macros: {
      added: config.macros.length - replacedMacros,
      replaced: replacedMacros,
      removed: plan.macroIdsToDelete.size - replacedMacros
    }
  }
}

/** Writes the file into the database in a single transaction: any failure
 *  rolls the whole import back. Existing applications keep their own
 *  name and process name; only missing ones are added. */
export function applyConfigImport(db: Database.Database, config: ConfigFile, mode: ConfigImportMode): void {
  const run = db.transaction(() => {
    const plan = planImport(db, config, mode)

    const deleteMacro = db.prepare('DELETE FROM macros WHERE id = ?')
    for (const id of plan.macroIdsToDelete) deleteMacro.run(id)
    const deleteControl = db.prepare('DELETE FROM controls WHERE id = ?')
    for (const id of plan.strayControlIdsToDelete) deleteControl.run(id)
    const deleteProfileControls = db.prepare('DELETE FROM controls WHERE profile_id = ?')
    const deleteProfile = db.prepare('DELETE FROM profiles WHERE id = ?')
    for (const id of plan.profileIdsToDelete) {
      // Explicit rather than relying on ON DELETE CASCADE alone, so the
      // result doesn't depend on the foreign_keys pragma.
      deleteProfileControls.run(id)
      deleteProfile.run(id)
    }

    const insertApplication = db.prepare(
      'INSERT OR IGNORE INTO applications (id, name, process_name, icon) VALUES (@id, @name, @processName, @icon)'
    )
    for (const application of config.applications) insertApplication.run(application)

    const insertProfile = db.prepare(
      'INSERT INTO profiles (id, application_id, name, icon, is_active) VALUES (@id, @applicationId, @name, @icon, @isActive)'
    )
    for (const profile of config.profiles) insertProfile.run({ ...profile, isActive: profile.isActive ? 1 : 0 })

    const insertControl = db.prepare(
      `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
       VALUES (@id, @profileId, @slot, @label, @actionType, @actionPayload)`
    )
    for (const control of config.controls) {
      insertControl.run({
        id: control.id,
        profileId: control.profileId,
        slot: control.slot,
        label: control.label,
        actionType: control.action.type,
        actionPayload: JSON.stringify(control.action)
      })
    }

    const insertMacro = db.prepare(
      `INSERT INTO macros (id, name, application_id, trigger, actions, delay_ms, enabled)
       VALUES (@id, @name, @applicationId, @trigger, @actions, @delayMs, @enabled)`
    )
    for (const macro of config.macros) {
      insertMacro.run({
        id: macro.id,
        name: macro.name,
        applicationId: macro.applicationId,
        trigger: macro.trigger,
        actions: JSON.stringify(macro.actions),
        delayMs: macro.delayMs,
        enabled: macro.enabled ? 1 : 0
      })
    }
  })
  run()
}
