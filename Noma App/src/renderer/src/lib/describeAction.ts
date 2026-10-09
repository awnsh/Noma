import type { ControlAction } from '@shared/types'
import { isMacRenderer } from './platform'

/**
 * Short, physical-display-safe captions and glyphs for a control's action —
 * this phase's section 4 ("give each control a clear physical identity").
 * Deliberately separate from Developer.tsx's `describeAction` (which is
 * verbose and engineer-facing, e.g. "shortcut: Control+F5") — this one has
 * to fit under a tile's label the way a caption on a real keycap would.
 */

const KEY_ABBREVIATIONS: Record<string, string> = {
  Control: 'Ctrl',
  // The keys as this OS's keyboard labels them.
  Meta: isMacRenderer ? 'Cmd' : 'Win',
  Alt: isMacRenderer ? 'Option' : 'Alt',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backquote: '`'
}

/** e.g. ['Control', 'Shift', 'F'] -> "Ctrl+Shift+F". */
export function formatShortcutCaption(keys: string[]): string {
  return keys.map((key) => KEY_ABBREVIATIONS[key] ?? key).join('+')
}

/** Plain names for the system commands (the ids are SYSTEM_COMMAND_CATALOG's,
 *  which stay camelCase because they are stored). Used by the editors'
 *  dropdowns and the tile caption; an id missing here shows as itself. */
const SYSTEM_COMMAND_LABELS: Record<string, string> = {
  volumeMute: 'Mute',
  volumeUp: 'Volume up',
  volumeDown: 'Volume down',
  mediaPlayPause: 'Play/Pause',
  mediaNextTrack: 'Next track',
  mediaPrevTrack: 'Previous track'
}

export function systemCommandLabel(command: string): string {
  return Object.hasOwn(SYSTEM_COMMAND_LABELS, command) ? SYSTEM_COMMAND_LABELS[command] : command
}

/** One glyph representing what kind of thing this control does — the
 *  physical-identity marker in the corner of a control tile. */
export function actionGlyph(action: ControlAction | undefined): string {
  if (!action) return '–'
  switch (action.type) {
    case 'none':
      return ''
    case 'shortcut':
      return '⌨'
    case 'macro':
      return '⚡'
    case 'launchApplication':
      return '↗'
    case 'systemCommand':
      return '⚙'
    case 'flowAction':
      return action.action === 'closeWindow' ? '✕' : '◆'
    case 'focusApplication':
      return '⇥'
    case 'click':
      return '◎'
  }
}

/** A short caption under the label — the shortcut itself for a keyboard
 *  shortcut, or a plain-language type tag for everything else. */
export function actionCaption(action: ControlAction | undefined): string | null {
  if (!action) return null
  switch (action.type) {
    case 'none':
      return null
    case 'shortcut':
      return action.keys.length > 0 ? formatShortcutCaption(action.keys) : null
    case 'systemCommand':
      return systemCommandLabel(action.command)
    case 'flowAction':
      return action.action === 'closeWindow' ? 'Close window' : action.action
    case 'macro':
      return 'Workflow'
    case 'launchApplication':
      return 'Open app'
    case 'focusApplication':
      return 'Switch app'
    case 'click':
      return 'Click'
  }
}
