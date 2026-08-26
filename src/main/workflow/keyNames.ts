import { UiohookKey } from 'uiohook-napi'

/**
 * The single source of truth for translating between uiohook-napi's raw
 * keycodes and the canonical key-name vocabulary Flow stores everywhere
 * else — captured combos (workflow_events), configured control actions
 * (controls.action_payload), and macros (macros.actions). Used in both
 * directions: captureService.ts reads an incoming keydown's code and
 * needs its name; actionExecutor.ts has a stored name and needs the code
 * to synthesize a keypress.
 */

export type CommandModifierName = 'Control' | 'Alt' | 'Meta' | 'Shift'

/** Any of these keycodes (left- or right-hand) count as that modifier when
 *  *recognizing* an incoming keydown event. */
export const MODIFIER_KEYCODES: Partial<Record<number, CommandModifierName>> = {
  [UiohookKey.Ctrl]: 'Control',
  [UiohookKey.CtrlRight]: 'Control',
  [UiohookKey.Alt]: 'Alt',
  [UiohookKey.AltRight]: 'Alt',
  [UiohookKey.Meta]: 'Meta',
  [UiohookKey.MetaRight]: 'Meta',
  [UiohookKey.Shift]: 'Shift',
  [UiohookKey.ShiftRight]: 'Shift'
}

/** The single keycode used when *sending* a modifier (always the left-hand
 *  variant — good enough for synthesizing a configured shortcut). */
const MODIFIER_NAME_TO_KEYCODE: Record<CommandModifierName, number> = {
  Control: UiohookKey.Ctrl,
  Alt: UiohookKey.Alt,
  Meta: UiohookKey.Meta,
  Shift: UiohookKey.Shift
}

const KEY_NAME_BY_CODE = new Map<number, string>(
  Object.entries(UiohookKey).map(([name, code]) => [code as number, name])
)

/** The readable name for an incoming keydown event's own keycode (e.g. for
 *  building a captured combo). */
export function keyNameForCode(code: number): string | undefined {
  return KEY_NAME_BY_CODE.get(code)
}

/**
 * Resolves a canonical key/modifier name (as stored in a Control's
 * ControlAction or a Macro's actions) back to the UiohookKey code needed
 * to synthesize it. Returns undefined for anything not in the vocabulary
 * — callers must treat that as "refuse to execute", never guess.
 */
export function keyCodeForName(name: string): number | undefined {
  if (name in MODIFIER_NAME_TO_KEYCODE) {
    return MODIFIER_NAME_TO_KEYCODE[name as CommandModifierName]
  }
  const code = (UiohookKey as Record<string, number>)[name]
  return typeof code === 'number' ? code : undefined
}
