import { BROWSERS } from './browsers'
import { COMMUNICATION } from './communication'
import { CREATIVE } from './creative'
import { DEV_TOOLS } from './dev'
import { EDITORS } from './editors'
import { MUSIC } from './music'
import { NOTES } from './notes'
import { OFFICE } from './office'
import { SYSTEM } from './system'
import type { AppShortcuts } from './types'

export type { AppShortcuts, KnownShortcut } from './types'

/** Every app in the library. Add a new app to the file for its kind (or a new file) and it appears in the editor. */
export const SHORTCUT_LIBRARY: AppShortcuts[] = [
  ...EDITORS,
  ...BROWSERS,
  ...COMMUNICATION,
  ...CREATIVE,
  ...NOTES,
  ...OFFICE,
  ...SYSTEM,
  ...DEV_TOOLS,
  ...MUSIC
]

export interface KnownShortcutOption {
  label: string
  short: string
  keys: string[]
}

function appFor(applicationId: string): AppShortcuts | undefined {
  const id = applicationId.toLowerCase()
  return SHORTCUT_LIBRARY.find((app) => app.ids.includes(id) || app.contains?.some((part) => id.includes(part)))
}

/** The known shortcuts for an application on this platform, or an empty list. */
export function knownShortcutsFor(
  applicationId: string | null | undefined,
  platform: 'mac' | 'windows'
): KnownShortcutOption[] {
  const app = applicationId ? appFor(applicationId) : undefined
  return (app?.shortcuts ?? []).map((shortcut) => ({
    label: shortcut.label,
    short: shortcut.short,
    keys: platform === 'mac' ? shortcut.mac : shortcut.windows
  }))
}
