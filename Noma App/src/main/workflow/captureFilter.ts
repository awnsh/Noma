/**
 * The capture policy at the heart of Flow's privacy/legal design.
 *
 * Flow must never resemble a keylogger: it does not record what a user
 * types. This filter is the enforcement point: see
 * docs/privacy-and-legal.md for the full reasoning. It is a pure,
 * synchronous, unit-tested function specifically so it can run *inside*
 * the OS-level keyboard hook callback (Phase 4) before a rejected key
 * event is ever assembled into an object, buffered, logged, or passed
 * anywhere else in the app; rejection happens at the point of capture,
 * not after the fact.
 *
 * Policy:
 *  - A single key press is never captured. This is where typed content
 *    individual characters; lives.
 *  - A Shift-only combination is never captured. Shift is how capital
 *    letters and symbols are typed (i.e. content), not how commands are
 *    invoked.
 *  - A combination is captured only if it includes at least one of
 *    Control, Alt, or Meta (the Windows key) held together with at least
 *    one other key. This is the class of input that represents an
 *    application *command*. Ctrl+S, Ctrl+Shift+P, Alt+Tab, Win+D; never
 *    typed text. Shift may still be present alongside one of these
 *    (Ctrl+Shift+P is a real, meaningful shortcut and is captured).
 *  - macOS only: Option (Alt) is also how characters are typed there
 *    (Option+E then E is "é", Option+G is "©"), so Option or Option+Shift
 *    with a character key is typing, not a command, and is never captured.
 *    Option still counts with keys that type nothing (F-keys, arrows, Tab,
 *    Escape...), and Option alongside Control or Command is a command.
 */

import { isMac } from '../platform'

export const COMMAND_MODIFIER_KEYS = ['Control', 'Alt', 'Meta'] as const
export type CommandModifierKey = (typeof COMMAND_MODIFIER_KEYS)[number]

/** Keys that type no character even with Option held on a Mac. */
const NON_CHARACTER_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
  'Backspace',
  'Tab',
  'Escape',
  'Enter'
])

function typesNoCharacter(key: string): boolean {
  return NON_CHARACTER_KEYS.has(key) || /^F\d{1,2}$/.test(key)
}

export function shouldCaptureKeyCombo(keys: string[], mac: boolean = isMac): boolean {
  if (keys.length < 2) {
    return false
  }

  if (!keys.some((key) => (COMMAND_MODIFIER_KEYS as readonly string[]).includes(key))) return false
  if (mac && !keys.includes('Control') && !keys.includes('Meta')) {
    return typesNoCharacter(keys[keys.length - 1])
  }
  return true
}
