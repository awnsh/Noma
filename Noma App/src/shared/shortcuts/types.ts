/**
 * The shortcut library: shortcuts people already know in the apps they use, so a
 * zone can be set to "Command palette" in Visual Studio Code by picking it instead
 * of recording keys.
 *
 * Rules for adding to it:
 * - Only an app's documented default shortcuts. If you are not sure, leave it out;
 *   the recorder is always one click away.
 * - Keys use Noma's own key names (the ones a recorded shortcut produces) and each
 *   shortcut has a Windows and a Mac form, since the modifiers differ (Control on
 *   Windows is usually Command, written Meta, on a Mac).
 * - `short` is the zone name the shortcut gets. At most MAX_CONTROL_LABEL_LENGTH
 *   characters, the limit of the small display a zone can appear on.
 * - Ids are the ones app detection reports (appKnowledge.ts): the lowercased exe name
 *   on Windows, mapped to the same id on a Mac.
 * index.test.ts checks every shortcut here is sendable and every name fits.
 */
export interface KnownShortcut {
  label: string
  short: string
  windows: string[]
  mac: string[]
}

export interface AppShortcuts {
  /** Shown in docs and tests; not in the UI. */
  name: string
  ids: string[]
  /** Substrings of an id, for apps whose id includes a version (Premiere, for one). */
  contains?: string[]
  shortcuts: KnownShortcut[]
}

/** A shortcut whose keys are the same on Windows and a Mac. */
export function same(label: string, short: string, keys: string[]): KnownShortcut {
  return { label, short, windows: keys, mac: keys }
}

/** A shortcut that uses Control on Windows and Command on a Mac, with the same other keys. */
export function cmd(label: string, short: string, ...rest: string[]): KnownShortcut {
  return { label, short, windows: ['Control', ...rest], mac: ['Meta', ...rest] }
}
