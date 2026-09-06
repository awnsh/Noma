/**
 * Turns a display shortcut string (e.g. "Ctrl+Shift+F") into the canonical
 * key names HardwareKeyboard.tsx's layout data uses, so pressing a contextual
 * control can flash the literal keys on the decorative base keyboard —
 * the same "physical keys stay, their meaning doesn't" idea the Noma App's
 * real KeyboardLayout.tsx demonstrates with captured shortcuts.
 */
const TOKEN_MAP: Record<string, string> = {
  Ctrl: 'Control',
  Shift: 'Shift',
  Alt: 'Alt',
  Win: 'Meta',
  Space: 'Space',
  '←': 'ArrowLeft',
  '→': 'ArrowRight',
  '↑': 'ArrowUp',
  '↓': 'ArrowDown',
  '`': 'Backquote',
  '=': 'Equal',
}

export function parseShortcutToKeyNames(shortcut: string): string[] {
  if (shortcut === 'Hold') return []
  return shortcut
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => TOKEN_MAP[token] ?? (token.length === 1 ? token.toUpperCase() : token))
}
