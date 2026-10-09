import {
  FLOW_ACTION_CATALOG,
  MAX_MACRO_NAME_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  SYSTEM_COMMAND_CATALOG
} from '@shared/constants'
import type {
  Application,
  ControlAction,
  MacroStep,
  ModuleFunctionConfig,
  OnboardingState,
  OnboardingStepId
} from '@shared/types'

/**
 * Runtime shape checks for everything the renderer sends over IPC.
 *
 * TypeScript's types stop at the process boundary: `ipcMain.handle`'s
 * arguments are whatever the renderer's structured clone produced, typed
 * only by the handler's own annotation. Without a check, a malformed action
 * (a shortcut whose `keys` is a string, a delay of `"500"`, a click with no
 * target) is written to SQLite as-is and only fails later, at press time,
 * far from the edit that caused it, or worse, partway through a macro.
 * Every handler in handlers.ts that accepts a structured payload runs it
 * through one of these first and refuses the call (null/false/{ok:false},
 * matching that handler's normal "didn't happen" result) rather than
 * throwing, so a bad payload never becomes a rejected promise the renderer
 * doesn't handle.
 *
 * Deliberately pure and dependency-free (no zod): small, closed unions that
 * are easier to read as a switch than as a schema, and testable without
 * Electron or a database. Fail closed throughout: an unknown variant, an
 * unknown key, a non-finite number or an over-long string is invalid, never
 * coerced. The one exception is user-typed names (normalizeName), which are
 * trimmed and capped because that's what the user meant, not a malformed
 * payload.
 *
 * Membership checks (does this macro/application/slot exist) are not done
 * here; the repositories already answer those with null. This file only
 * answers "is this the right shape to be stored or executed at all".
 */

/** An application/macro/suggestion/module id: a UUID or a short slug in practice. */
export const MAX_ID_LENGTH = 256
/** One key name in a shortcut ("Control", "F12", "Backquote"). */
export const MAX_KEY_NAME_LENGTH = 32
/** Modifiers plus a key; nothing real needs more than a handful. */
export const MAX_SHORTCUT_KEYS = 8
/** A `click` step's target (`label:<name>` / `zone:<col>x<row>`); see clickTarget.ts. */
export const MAX_CLICK_TARGET_LENGTH = 512
/** A macro's `delay` step, in ms. A minute is already far past any real
 *  pacing need; longer is far more likely a typo than an intent, and a
 *  press that silently does nothing for an hour holds the action lock. */
export const MAX_DELAY_MS = 60_000
/** Steps in one macro; learned workflows are a handful, hand-built ones tens. */
export const MAX_MACRO_STEPS = 100
/** A control's label before toDisplayLabel shortens it for the display. The
 *  display limit is MAX_CONTROL_LABEL_LENGTH; this only bounds the payload. */
export const MAX_CONTROL_LABEL_INPUT_LENGTH = 256
/** Physical slots on one profile; well beyond any real module layout. */
export const MAX_SLOT = 64
/** A module function's display name (the editor's input allows 20). */
export const MAX_MODULE_FUNCTION_LABEL_LENGTH = 64
/** Capability functions configured on one module (turn/press/...). */
export const MAX_MODULE_FUNCTIONS = 16
export const MAX_APPLICATION_NAME_LENGTH = 256
/** Comfortably above Windows' MAX_PATH and typical macOS bundle paths. */
export const MAX_EXECUTABLE_PATH_LENGTH = 4096
export const MAX_APPLICATION_ICON_LENGTH = 1024
/** The Activity chart's lookback window, in days. */
export const MAX_ACTIVITY_DAYS = 366

/** Keys that must never be accepted as record keys from the renderer:
 *  copying them onto a plain object can reach Object.prototype. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** A plain `{...}` object as produced by structured clone; not an array,
 *  not null, not a class instance. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Exactly the listed keys may be present (a missing optional key is fine;
 *  an unexpected one is not), so nothing extra rides along into storage. */
function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

export function isBoundedString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= maxLength && (allowEmpty || value.length > 0)
}

export function isValidId(value: unknown): value is string {
  return isBoundedString(value, MAX_ID_LENGTH) && value.trim().length > 0
}

/** 1-based physical slot position (see Control.slot). */
export function isValidSlot(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_SLOT
}

function isOptional<T>(value: unknown, check: (candidate: unknown) => candidate is T): boolean {
  return value === undefined || check(value)
}

const CLICK_ZONE_TARGET = /^zone:\d{1,3}x\d{1,3}$/

function isValidClickTarget(value: unknown): value is string {
  if (!isBoundedString(value, MAX_CLICK_TARGET_LENGTH)) return false
  if (value.startsWith('label:')) return value.length > 'label:'.length
  return CLICK_ZONE_TARGET.test(value)
}

function isValidShortcutKeys(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_SHORTCUT_KEYS &&
    // An empty combo is allowed: it's a new profile's placeholder, and
    // actionExecutor already refuses to send it with a clear reason.
    value.every((key) => isBoundedString(key, MAX_KEY_NAME_LENGTH))
  )
}

/**
 * Exhaustive over ControlAction's variants. `systemCommand` and
 * `flowAction` are checked against the same shared catalogs the executor
 * and the editors use, so a command added to SYSTEM_COMMAND_CATALOG
 * validates here automatically, and nothing outside it can be stored.
 */
export function isValidControlAction(value: unknown): value is ControlAction {
  if (!isPlainObject(value)) return false
  const action = value as Record<string, unknown> & { type?: unknown }
  switch (action.type) {
    case 'none':
      return hasOnlyKeys(action, ['type'])
    case 'shortcut':
      return hasOnlyKeys(action, ['type', 'keys']) && isValidShortcutKeys(action.keys)
    case 'macro':
      return hasOnlyKeys(action, ['type', 'macroId']) && isValidId(action.macroId)
    case 'launchApplication':
    case 'focusApplication':
      return hasOnlyKeys(action, ['type', 'applicationId']) && isValidId(action.applicationId)
    case 'systemCommand':
      return (
        hasOnlyKeys(action, ['type', 'command']) &&
        typeof action.command === 'string' &&
        SYSTEM_COMMAND_CATALOG.includes(action.command)
      )
    case 'flowAction':
      return (
        hasOnlyKeys(action, ['type', 'action']) &&
        typeof action.action === 'string' &&
        FLOW_ACTION_CATALOG.includes(action.action)
      )
    case 'click':
      return (
        hasOnlyKeys(action, ['type', 'target', 'applicationId']) &&
        isValidClickTarget(action.target) &&
        isOptional(action.applicationId, isValidId)
      )
    default:
      return false
  }
}

function isValidDelayMs(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_DELAY_MS
}

export function isValidMacroStep(value: unknown): value is MacroStep {
  if (isPlainObject(value) && value.type === 'delay') {
    return hasOnlyKeys(value, ['type', 'ms']) && isValidDelayMs(value.ms)
  }
  return isValidControlAction(value)
}

/** An empty list is valid (an unsaved, not-yet-built macro); the Test
 *  button is already disabled for it and running it is a no-op. */
export function isValidMacroSteps(value: unknown): value is MacroStep[] {
  return Array.isArray(value) && value.length <= MAX_MACRO_STEPS && value.every(isValidMacroStep)
}

export function isValidApplication(value: unknown): value is Application {
  if (!isPlainObject(value)) return false
  return (
    hasOnlyKeys(value, ['id', 'name', 'processName', 'executablePath', 'icon']) &&
    isValidId(value.id) &&
    isBoundedString(value.name, MAX_APPLICATION_NAME_LENGTH) &&
    value.name.trim().length > 0 &&
    isBoundedString(value.processName, MAX_APPLICATION_NAME_LENGTH) &&
    value.processName.trim().length > 0 &&
    isOptional(value.executablePath, (candidate): candidate is string =>
      isBoundedString(candidate, MAX_EXECUTABLE_PATH_LENGTH)
    ) &&
    isOptional(value.icon, (candidate): candidate is string =>
      isBoundedString(candidate, MAX_APPLICATION_ICON_LENGTH)
    )
  )
}

/** A control's label as sent by the editor. Empty is allowed (a cleared
 *  zone); the display-length cap itself is applied by toDisplayLabel. */
export function isValidControlLabel(value: unknown): value is string {
  return isBoundedString(value, MAX_CONTROL_LABEL_INPUT_LENGTH, true)
}

export function isValidModuleConfiguration(value: unknown): value is Record<string, ModuleFunctionConfig> {
  if (!isPlainObject(value)) return false
  const entries = Object.entries(value)
  if (entries.length > MAX_MODULE_FUNCTIONS) return false
  return entries.every(
    ([functionName, config]) =>
      !FORBIDDEN_KEYS.has(functionName) &&
      isBoundedString(functionName, MAX_ID_LENGTH) &&
      isPlainObject(config) &&
      hasOnlyKeys(config, ['label', 'action']) &&
      isBoundedString(config.label, MAX_MODULE_FUNCTION_LABEL_LENGTH) &&
      isValidControlAction(config.action)
  )
}

export interface MacroUpdate {
  name?: string
  actions?: MacroStep[]
  enabled?: boolean
}

/** UPDATE_MACRO's `updates`: only these three fields, each optional and
 *  well-formed. `name` is normalized (trimmed, capped); an empty name is
 *  refused rather than written. Returns null if anything is invalid. */
export function parseMacroUpdate(value: unknown): MacroUpdate | null {
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['name', 'actions', 'enabled'])) return null
  const update: MacroUpdate = {}
  if (value.name !== undefined) {
    const name = normalizeName(value.name, MAX_MACRO_NAME_LENGTH)
    if (name === null) return null
    update.name = name
  }
  if (value.actions !== undefined) {
    if (!isValidMacroSteps(value.actions)) return null
    update.actions = value.actions
  }
  if (value.enabled !== undefined) {
    if (typeof value.enabled !== 'boolean') return null
    update.enabled = value.enabled
  }
  return update
}

const ONBOARDING_STEPS: readonly OnboardingStepId[] = ['welcome', 'glide', 'flow', 'firstAction']

/** SAVE_ONBOARDING_STATE's partial update: known keys, right types. */
export function isValidOnboardingUpdate(value: unknown): value is Partial<OnboardingState> {
  if (!isPlainObject(value)) return false
  if (!hasOnlyKeys(value, ['completed', 'step', 'selectedUseCases', 'flowEnabled', 'hardwareSkipped'])) return false
  const isBool = (candidate: unknown): candidate is boolean => typeof candidate === 'boolean'
  return (
    isOptional(value.completed, isBool) &&
    isOptional(value.flowEnabled, isBool) &&
    isOptional(value.hardwareSkipped, isBool) &&
    (value.step === undefined || ONBOARDING_STEPS.includes(value.step as OnboardingStepId)) &&
    (value.selectedUseCases === undefined ||
      (Array.isArray(value.selectedUseCases) &&
        value.selectedUseCases.length <= 32 &&
        value.selectedUseCases.every((useCase) => isBoundedString(useCase, 64))))
  )
}

export const SUGGESTION_RESOLUTIONS = ['accepted', 'rejected', 'dismissed'] as const

export function isValidSuggestionResolution(value: unknown): value is (typeof SUGGESTION_RESOLUTIONS)[number] {
  return typeof value === 'string' && (SUGGESTION_RESOLUTIONS as readonly string[]).includes(value)
}

export function isValidActivityDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_ACTIVITY_DAYS
}

/** A simulated encoder turn: a small whole number of detents either way. */
export function isValidEncoderDelta(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= 100
}

/**
 * A user-typed name (profile, macro): trimmed, refused if empty, and capped
 * at `maxLength` characters (cut, not refused: an over-long name is still
 * clearly what the user meant, and the cap only protects the lists and
 * small displays it appears in). Line breaks and other control characters
 * become spaces so a pasted name can't break a one-line layout. Returns
 * null for a non-string or a name that's empty after trimming.
 */
export function normalizeName(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()
  if (cleaned.length === 0) return null
  // Array.from splits by code point, so the cut never leaves half a surrogate pair.
  const chars = Array.from(cleaned)
  return chars.length > maxLength ? chars.slice(0, maxLength).join('').trimEnd() : cleaned
}

export function normalizeProfileName(value: unknown): string | null {
  return normalizeName(value, MAX_PROFILE_NAME_LENGTH)
}

export function normalizeMacroName(value: unknown): string | null {
  return normalizeName(value, MAX_MACRO_NAME_LENGTH)
}
