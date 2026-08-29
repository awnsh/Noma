// Demo data for the Virtual Keyboard mockup in AppPreview.tsx — a plausible
// shortcut per control so pressing a tile has something real to flash on the
// keyboard grid below it. Mirrors the shape of the actual app's `Control` /
// `ControlAction` types (src/shared/types in Noma App) closely enough that
// porting real data over later is a straight copy, not a rewrite.

const KEY_ABBREVIATIONS: Record<string, string> = {
  Control: 'Ctrl',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backquote: '`',
}

/** e.g. ['Control', 'Shift', 'F'] -> "Ctrl+Shift+F" — same abbreviation
 *  rules the real app's control tiles use for a shortcut's caption. */
export function formatShortcutCaption(keys: string[]): string {
  return keys.map((key) => KEY_ABBREVIATIONS[key] ?? key).join('+')
}

// One shortcut per control label used anywhere in appProfiles.ts.
export const controlKeys: Record<string, string[]> = {
  Run: ['Control', 'F5'],
  Debug: ['F5'],
  Terminal: ['Control', 'Backquote'],
  Search: ['Control', 'F'],
  Cut: ['Control', 'X'],
  Ripple: ['Shift', 'Delete'],
  Zoom: ['Equal'],
  Export: ['Control', 'M'],
  Rotate: ['Control', '1'],
  Measure: ['Control', '2'],
  Extrude: ['Control', 'E'],
  Save: ['Control', 'S'],
  Back: ['Alt', 'ArrowLeft'],
  Forward: ['Alt', 'ArrowRight'],
  'New Tab': ['Control', 'T'],
  Close: ['Control', 'W'],
  'Command Palette': ['Control', 'Shift', 'P'],
  'Git Commit': ['Control', 'Enter'],
}
