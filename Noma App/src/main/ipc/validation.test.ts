import { describe, expect, it } from 'vitest'
import {
  FLOW_ACTION_CATALOG,
  MAX_MACRO_NAME_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  SYSTEM_COMMAND_CATALOG
} from '@shared/constants'
import {
  MAX_DELAY_MS,
  MAX_MACRO_STEPS,
  MAX_SHORTCUT_KEYS,
  isValidActivityDays,
  isValidApplication,
  isValidControlAction,
  isValidControlLabel,
  isValidEncoderDelta,
  isValidId,
  isValidMacroStep,
  isValidMacroSteps,
  isValidModuleConfiguration,
  isValidOnboardingUpdate,
  isValidSlot,
  isValidSuggestionResolution,
  normalizeMacroName,
  normalizeName,
  normalizeProfileName,
  parseMacroUpdate
} from './validation'

describe('isValidControlAction', () => {
  it('accepts every well-formed variant', () => {
    const valid: unknown[] = [
      { type: 'none' },
      { type: 'shortcut', keys: ['Control', 'Shift', 'F'] },
      { type: 'shortcut', keys: [] },
      { type: 'macro', macroId: 'm-1' },
      { type: 'launchApplication', applicationId: 'code' },
      { type: 'focusApplication', applicationId: 'code' },
      { type: 'systemCommand', command: SYSTEM_COMMAND_CATALOG[0] },
      { type: 'flowAction', action: FLOW_ACTION_CATALOG[0] },
      { type: 'click', target: 'label:Save' },
      { type: 'click', target: 'zone:2x3', applicationId: 'notepad' },
      { type: 'click', target: 'zone:2x3', applicationId: undefined }
    ]
    for (const action of valid) expect(isValidControlAction(action), JSON.stringify(action)).toBe(true)
  })

  it('accepts every system command in the shared catalog, so new commands validate automatically', () => {
    for (const command of SYSTEM_COMMAND_CATALOG) {
      expect(isValidControlAction({ type: 'systemCommand', command })).toBe(true)
    }
  })

  it('rejects non-objects and unknown variants', () => {
    for (const value of [null, undefined, 'shortcut', 42, [], [{ type: 'none' }], { type: 'delay', ms: 5 }, { type: 'runShell' }, {}]) {
      expect(isValidControlAction(value), JSON.stringify(value)).toBe(false)
    }
  })

  it('rejects a shortcut whose keys are not a bounded array of non-empty strings', () => {
    expect(isValidControlAction({ type: 'shortcut', keys: 'Control+C' })).toBe(false)
    expect(isValidControlAction({ type: 'shortcut' })).toBe(false)
    expect(isValidControlAction({ type: 'shortcut', keys: ['Control', 3] })).toBe(false)
    expect(isValidControlAction({ type: 'shortcut', keys: ['Control', ''] })).toBe(false)
    expect(isValidControlAction({ type: 'shortcut', keys: ['x'.repeat(33)] })).toBe(false)
    expect(isValidControlAction({ type: 'shortcut', keys: Array(MAX_SHORTCUT_KEYS + 1).fill('A') })).toBe(false)
  })

  it('rejects system commands and flow actions outside their catalogs', () => {
    expect(isValidControlAction({ type: 'systemCommand', command: 'shutdown' })).toBe(false)
    expect(isValidControlAction({ type: 'systemCommand', command: 'rm -rf /' })).toBe(false)
    expect(isValidControlAction({ type: 'systemCommand' })).toBe(false)
    expect(isValidControlAction({ type: 'flowAction', action: 'formatDisk' })).toBe(false)
  })

  it('rejects missing, empty, wrong-typed or over-long ids', () => {
    expect(isValidControlAction({ type: 'macro' })).toBe(false)
    expect(isValidControlAction({ type: 'macro', macroId: '' })).toBe(false)
    expect(isValidControlAction({ type: 'macro', macroId: '   ' })).toBe(false)
    expect(isValidControlAction({ type: 'macro', macroId: 7 })).toBe(false)
    expect(isValidControlAction({ type: 'focusApplication', applicationId: 'a'.repeat(257) })).toBe(false)
  })

  it('rejects malformed click targets', () => {
    expect(isValidControlAction({ type: 'click' })).toBe(false)
    expect(isValidControlAction({ type: 'click', target: 'Save' })).toBe(false)
    expect(isValidControlAction({ type: 'click', target: 'label:' })).toBe(false)
    expect(isValidControlAction({ type: 'click', target: 'zone:axb' })).toBe(false)
    expect(isValidControlAction({ type: 'click', target: 'zone:1x1', applicationId: null })).toBe(false)
  })

  it('rejects extra keys, so nothing unexpected is stored alongside an action', () => {
    expect(isValidControlAction({ type: 'none', keys: ['A'] })).toBe(false)
    expect(isValidControlAction({ type: 'shortcut', keys: ['A'], command: 'volumeUp' })).toBe(false)
  })
})

describe('isValidMacroStep(s)', () => {
  it('accepts delays within 0..MAX_DELAY_MS', () => {
    expect(isValidMacroStep({ type: 'delay', ms: 0 })).toBe(true)
    expect(isValidMacroStep({ type: 'delay', ms: 250.5 })).toBe(true)
    expect(isValidMacroStep({ type: 'delay', ms: MAX_DELAY_MS })).toBe(true)
  })

  it('rejects negative, non-finite, over-long or non-numeric delays', () => {
    for (const ms of [-1, MAX_DELAY_MS + 1, Infinity, NaN, '500', undefined]) {
      expect(isValidMacroStep({ type: 'delay', ms }), String(ms)).toBe(false)
    }
    expect(isValidMacroStep({ type: 'delay', ms: 5, extra: true })).toBe(false)
  })

  it('accepts control actions as steps and validates them the same way', () => {
    expect(isValidMacroStep({ type: 'shortcut', keys: ['Control', 'C'] })).toBe(true)
    expect(isValidMacroStep({ type: 'shortcut', keys: 'Control+C' })).toBe(false)
  })

  it('checks every step of a sequence, and bounds its length', () => {
    expect(isValidMacroSteps([])).toBe(true)
    expect(isValidMacroSteps([{ type: 'shortcut', keys: ['Control', 'C'] }, { type: 'delay', ms: 100 }])).toBe(true)
    expect(isValidMacroSteps([{ type: 'shortcut', keys: ['Control', 'C'] }, { type: 'delay', ms: -5 }])).toBe(false)
    expect(isValidMacroSteps({ 0: { type: 'none' }, length: 1 })).toBe(false)
    expect(isValidMacroSteps(null)).toBe(false)
    expect(isValidMacroSteps(Array(MAX_MACRO_STEPS + 1).fill({ type: 'none' }))).toBe(false)
  })
})

describe('isValidApplication', () => {
  const notepad = { id: 'notepad', name: 'Notepad', processName: 'notepad.exe' }

  it('accepts a minimal application and the optional fields, including present-but-undefined', () => {
    expect(isValidApplication(notepad)).toBe(true)
    expect(isValidApplication({ ...notepad, executablePath: 'C:\\Windows\\notepad.exe', icon: 'notepad' })).toBe(true)
    expect(isValidApplication({ ...notepad, executablePath: undefined, icon: undefined })).toBe(true)
  })

  it('rejects missing, empty or wrong-typed required fields', () => {
    expect(isValidApplication({ ...notepad, id: '' })).toBe(false)
    expect(isValidApplication({ ...notepad, name: '  ' })).toBe(false)
    expect(isValidApplication({ name: 'Notepad', processName: 'notepad.exe' })).toBe(false)
    expect(isValidApplication({ ...notepad, processName: 5 })).toBe(false)
    expect(isValidApplication({ ...notepad, executablePath: null })).toBe(false)
    expect(isValidApplication({ ...notepad, name: 'n'.repeat(257) })).toBe(false)
    expect(isValidApplication({ ...notepad, extra: 1 })).toBe(false)
    expect(isValidApplication(null)).toBe(false)
  })
})

describe('isValidModuleConfiguration', () => {
  it('accepts named functions with valid actions, and an empty configuration', () => {
    expect(isValidModuleConfiguration({})).toBe(true)
    expect(
      isValidModuleConfiguration({
        turn: { label: 'Zoom', action: { type: 'shortcut', keys: ['Control', 'Equal'] } },
        press: { label: 'Mute', action: { type: 'systemCommand', command: SYSTEM_COMMAND_CATALOG[0] } }
      })
    ).toBe(true)
  })

  it('rejects malformed entries and prototype keys', () => {
    expect(isValidModuleConfiguration({ turn: { label: 'Zoom', action: { type: 'shortcut', keys: 'x' } } })).toBe(false)
    expect(isValidModuleConfiguration({ turn: { label: 5, action: { type: 'none' } } })).toBe(false)
    expect(isValidModuleConfiguration({ turn: { action: { type: 'none' } } })).toBe(false)
    expect(isValidModuleConfiguration(JSON.parse('{"__proto__": {"label": "x", "action": {"type": "none"}}}'))).toBe(false)
    expect(isValidModuleConfiguration([])).toBe(false)
  })
})

describe('scalar validators', () => {
  it('slots are positive integers', () => {
    expect(isValidSlot(1)).toBe(true)
    expect(isValidSlot(4)).toBe(true)
    for (const slot of [0, -1, 1.5, NaN, Infinity, '1', null, 65]) expect(isValidSlot(slot), String(slot)).toBe(false)
  })

  it('ids are non-blank bounded strings', () => {
    expect(isValidId('abc')).toBe(true)
    for (const id of ['', '   ', 5, null, undefined, 'x'.repeat(257)]) expect(isValidId(id)).toBe(false)
  })

  it('control labels may be empty (a cleared zone) but must be bounded strings', () => {
    expect(isValidControlLabel('')).toBe(true)
    expect(isValidControlLabel('RUN')).toBe(true)
    expect(isValidControlLabel(null)).toBe(false)
    expect(isValidControlLabel('x'.repeat(257))).toBe(false)
  })

  it('suggestion resolutions, activity days and encoder deltas', () => {
    expect(isValidSuggestionResolution('accepted')).toBe(true)
    expect(isValidSuggestionResolution('pending')).toBe(false)
    expect(isValidActivityDays(7)).toBe(true)
    expect(isValidActivityDays(0)).toBe(false)
    expect(isValidActivityDays(1e9)).toBe(false)
    expect(isValidEncoderDelta(-3)).toBe(true)
    expect(isValidEncoderDelta(0.5)).toBe(false)
    expect(isValidEncoderDelta(1e6)).toBe(false)
  })

  it('onboarding updates: known keys with the right types only', () => {
    expect(isValidOnboardingUpdate({ step: 'glide' })).toBe(true)
    expect(isValidOnboardingUpdate({ completed: true, flowEnabled: false, selectedUseCases: ['code'] })).toBe(true)
    expect(isValidOnboardingUpdate({ step: 'nowhere' })).toBe(false)
    expect(isValidOnboardingUpdate({ completed: 'yes' })).toBe(false)
    expect(isValidOnboardingUpdate({ isAdmin: true })).toBe(false)
  })
})

describe('normalizeName', () => {
  it('trims, and refuses a name that is empty after trimming or not a string', () => {
    expect(normalizeName('  My Setup  ', 64)).toBe('My Setup')
    expect(normalizeName('', 64)).toBeNull()
    expect(normalizeName('   \n\t ', 64)).toBeNull()
    expect(normalizeName(42, 64)).toBeNull()
    expect(normalizeName(undefined, 64)).toBeNull()
  })

  it('caps the length rather than refusing a long name', () => {
    expect(normalizeProfileName('p'.repeat(500))).toBe('p'.repeat(MAX_PROFILE_NAME_LENGTH))
    expect(normalizeMacroName('m'.repeat(500))).toBe('m'.repeat(MAX_MACRO_NAME_LENGTH))
  })

  it('never cuts a surrogate pair in half', () => {
    const capped = normalizeName('ab😀😀', 3)
    expect(capped).toBe('ab😀')
  })

  it('turns line breaks and control characters into spaces', () => {
    expect(normalizeName('Line one\nLine two', 64)).toBe('Line one Line two')
  })
})

describe('parseMacroUpdate', () => {
  it('keeps only valid known fields, normalizing the name', () => {
    expect(parseMacroUpdate({ name: '  Copy all ', enabled: false })).toEqual({ name: 'Copy all', enabled: false })
    expect(parseMacroUpdate({ actions: [{ type: 'delay', ms: 10 }] })).toEqual({ actions: [{ type: 'delay', ms: 10 }] })
    expect(parseMacroUpdate({})).toEqual({})
  })

  it('refuses the whole update when any field is malformed or unknown', () => {
    expect(parseMacroUpdate({ name: '   ' })).toBeNull()
    expect(parseMacroUpdate({ enabled: 'true' })).toBeNull()
    expect(parseMacroUpdate({ actions: [{ type: 'delay', ms: -1 }] })).toBeNull()
    expect(parseMacroUpdate({ applicationId: 'code' })).toBeNull()
    expect(parseMacroUpdate(null)).toBeNull()
  })
})
