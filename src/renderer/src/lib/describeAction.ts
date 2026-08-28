import type { ControlAction } from '@shared/types'

/**
 * Short, physical-display-safe captions and glyphs for a control's action —
 * this phase's section 4 ("give each control a clear physical identity").
 * Deliberately separate from Developer.tsx's `describeAction` (which is
 * verbose and engineer-facing, e.g. "shortcut: Control+F5") — this one has
 * to fit under a tile's label the way a caption on a real keycap would.
 */

const KEY_ABBREVIATIONS: Record<string, string> = {
  Control: 'Ctrl',
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

/** One glyph representing what kind of thing this control does — the
 *  physical-identity marker in the corner of a control tile. */
export function actionGlyph(action: ControlAction | undefined): string {
  if (!action) return '—'
  switch (action.type) {
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
  }
}

/** A short caption under the label — the shortcut itself for a keyboard
 *  shortcut, or a plain-language type tag for everything else. */
export function actionCaption(action: ControlAction | undefined): string | null {
  if (!action) return null
  switch (action.type) {
    case 'shortcut':
      return action.keys.length > 0 ? formatShortcutCaption(action.keys) : null
    case 'systemCommand':
      return action.command
    case 'flowAction':
      return action.action
    case 'macro':
      return 'Macro'
    case 'launchApplication':
      return 'Launch'
  }
}
