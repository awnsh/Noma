/**
 * Turns "the user clicked here" into the only thing Noma is willing to
 * remember about it — the click-capture counterpart of captureFilter.ts, and
 * the single enforcement point for what a click may become. Pure, so it's
 * unit-tested and runs before anything is stored or logged.
 *
 * Policy (see docs/privacy-and-legal.md):
 *  - A click is only ever recorded as WHICH CONTROL it hit, never as content.
 *    Only command-style controls count (buttons, menu items, check/radio
 *    boxes). Tabs deliberately don't: in a browser a tab is named after the
 *    page ("Inbox", "Google Calendar - September 2026"), i.e. content. Text fields, documents, list/tree/table rows and links are
 *    where user content lives — filenames, messages, page text — and are
 *    never recorded, not even their type.
 *  - A control's name is kept only if it looks like a *label*: one to three
 *    plain words, no digits, no path/URL/e-mail punctuation. "Delete" and
 *    "Save As" pass; "Reply to a.b@x.com", "Report_Q3.xlsx", "3 unread" don't.
 *  - When an app doesn't expose named controls at all (many custom-drawn
 *    UIs), the click falls back to a coarse cell of a grid laid over the
 *    window — a position, not a name — so a repeated click sequence there is
 *    still recognizable without reading anything from the screen.
 */

/** UI Automation ProgrammaticNames of the control types whose *name* is a
 *  command label rather than user content. */
const COMMAND_CONTROL_TYPES = new Set([
  'ControlType.Button',
  'ControlType.SplitButton',
  'ControlType.MenuItem',
  'ControlType.CheckBox',
  'ControlType.RadioButton'
])

/** Control types where user content lives. A click on one is not recorded at
 *  all — not by label, and not even as a position — so where you click inside
 *  a document, a message box or a file list is never captured. */
const CONTENT_CONTROL_TYPES = new Set([
  'ControlType.Edit',
  'ControlType.Document',
  'ControlType.Text',
  'ControlType.ListItem',
  'ControlType.DataItem',
  'ControlType.TreeItem',
  'ControlType.Hyperlink',
  'ControlType.Image',
  'ControlType.ComboBox',
  'ControlType.Table',
  'ControlType.List',
  'ControlType.Tree',
  'ControlType.DataGrid',
  'ControlType.TitleBar'
])

const MAX_LABEL_LENGTH = 28
const MAX_LABEL_WORDS = 3

/** The cleaned label for a control name, or null if it isn't safe/useful. */
export function sanitizeControlLabel(controlType: string | null, name: string | null): string | null {
  if (!controlType || !COMMAND_CONTROL_TYPES.has(controlType) || !name) return null

  const cleaned = name
    .replace(/&(?=\S)/g, '') // Win32 accelerator marker: "&Delete" -> "Delete"
    .replace(/(\.{3}|…)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length === 0 || cleaned.length > MAX_LABEL_LENGTH) return null
  if (cleaned.split(' ').length > MAX_LABEL_WORDS) return null
  // Letters, spaces, hyphens and apostrophes only: no digits, and none of
  // the punctuation that paths, URLs, e-mail addresses and IDs are made of.
  if (!/^[\p{L}][\p{L} '-]*$/u.test(cleaned)) return null
  return cleaned
}

export const ZONE_COLUMNS = 16
export const ZONE_ROWS = 10
/** A window smaller than this in either direction is too small for a grid
 *  cell to mean anything (tooltips, popups, tray flyouts). */
const MIN_WINDOW_SIZE = 200

export interface ScreenRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** `zone:<col>x<row>`: the grid cell of the window the click landed in, or
 *  null if the point isn't inside a usably-large window. */
export function zoneForClick(x: number, y: number, window: ScreenRect): string | null {
  const width = window.right - window.left
  const height = window.bottom - window.top
  if (width < MIN_WINDOW_SIZE || height < MIN_WINDOW_SIZE) return null
  if (x < window.left || x >= window.right || y < window.top || y >= window.bottom) return null

  const col = Math.min(ZONE_COLUMNS - 1, Math.floor(((x - window.left) / width) * ZONE_COLUMNS))
  const row = Math.min(ZONE_ROWS - 1, Math.floor(((y - window.top) / height) * ZONE_ROWS))
  return `zone:${col}x${row}`
}

export interface RawClickInspection {
  controlType: string | null
  name: string | null
  window: ScreenRect | null
}

/** The stored target for one click: a sanitized label when the control's
 *  name is safe, else the window grid zone — but only where the app exposes
 *  nothing meaningful at that point (an opaque pane/canvas/window, as in
 *  custom-drawn UIs). A content control, or a command control whose name
 *  failed sanitizing, records nothing. */
export function clickTargetFor(x: number, y: number, inspection: RawClickInspection): string | null {
  if (inspection.controlType && CONTENT_CONTROL_TYPES.has(inspection.controlType)) return null
  const label = sanitizeControlLabel(inspection.controlType, inspection.name)
  if (label) return `label:${label}`
  // A real command control whose name isn't label-shaped is still a
  // *known* control, not an opaque surface: recording its position instead
  // would just be a back door around the name filter.
  if (inspection.controlType && COMMAND_CONTROL_TYPES.has(inspection.controlType)) return null
  return inspection.window ? zoneForClick(x, y, inspection.window) : null
}

const REGION_ROWS = ['top', 'middle', 'bottom'] as const
const REGION_COLUMNS = ['left', 'center', 'right'] as const

/** Human wording for a stored click target: "Delete" (quoted) for a label,
 *  or "a spot in the top-left" for a zone. */
export function describeClickTarget(target: string): string {
  if (target.startsWith('label:')) return `“${target.slice('label:'.length)}”`
  const match = /^zone:(\d+)x(\d+)$/.exec(target)
  if (!match) return 'a control'
  const col = Math.min(2, Math.floor((Number(match[1]) / ZONE_COLUMNS) * 3))
  const row = Math.min(2, Math.floor((Number(match[2]) / ZONE_ROWS) * 3))
  const vertical = REGION_ROWS[row]
  const horizontal = REGION_COLUMNS[col]
  return vertical === 'middle' && horizontal === 'center'
    ? 'a spot in the middle'
    : `a spot in the ${vertical}-${horizontal}`
}
