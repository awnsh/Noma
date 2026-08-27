/**
 * Maps a browser KeyboardEvent's `code` (layout-independent, e.g. "KeyS",
 * "Digit1", "ArrowLeft") to Flow's canonical key-name vocabulary — the
 * same names `src/main/workflow/keyNames.ts` uses on the main-process
 * side (UiohookKey property names). This is what lets the Control Mapping
 * Editor's shortcut recorder work with a plain `onKeyDown` in the
 * renderer (no native hook needed to *record* a shortcut, only to
 * *capture* one from ambient typing or to *send* one) while still
 * producing values `resolveShortcutParts` can execute.
 */

const LETTER_CODES: Record<string, string> = Object.fromEntries(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => [`Key${letter}`, letter])
)

const DIGIT_CODES: Record<string, string> = Object.fromEntries(
  '0123456789'.split('').map((digit) => [`Digit${digit}`, digit])
)

const FUNCTION_KEY_CODES: Record<string, string> = Object.fromEntries(
  Array.from({ length: 24 }, (_, index) => `F${index + 1}`).map((name) => [name, name])
)

const NUMPAD_DIGIT_CODES: Record<string, string> = Object.fromEntries(
  '0123456789'.split('').map((digit) => [`Numpad${digit}`, `Numpad${digit}`])
)

const DIRECT_CODES: Record<string, string> = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Escape: 'Escape',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  CapsLock: 'CapsLock',
  NumLock: 'NumLock',
  ScrollLock: 'ScrollLock',
  PrintScreen: 'PrintScreen',
  Backquote: 'Backquote',
  Minus: 'Minus',
  Equal: 'Equal',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight',
  Backslash: 'Backslash',
  Semicolon: 'Semicolon',
  Quote: 'Quote',
  Comma: 'Comma',
  Period: 'Period',
  Slash: 'Slash',
  NumpadMultiply: 'NumpadMultiply',
  NumpadAdd: 'NumpadAdd',
  NumpadSubtract: 'NumpadSubtract',
  NumpadDecimal: 'NumpadDecimal',
  NumpadDivide: 'NumpadDivide'
}

export const DOM_CODE_TO_KEY_NAME: Record<string, string> = {
  ...LETTER_CODES,
  ...DIGIT_CODES,
  ...FUNCTION_KEY_CODES,
  ...NUMPAD_DIGIT_CODES,
  ...DIRECT_CODES
}

/** DOM `code` values for modifier keys, mapped to Flow's canonical
 *  modifier names — deliberately the same four names keyNames.ts
 *  recognizes (Shift is allowed to ride along but never gates capture on
 *  its own — see captureFilter.ts; here it's just allowed as a modifier
 *  in a manually-configured shortcut). */
export const DOM_MODIFIER_CODE_TO_NAME: Record<string, 'Control' | 'Alt' | 'Meta' | 'Shift'> = {
  ControlLeft: 'Control',
  ControlRight: 'Control',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  MetaLeft: 'Meta',
  MetaRight: 'Meta',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift'
}
