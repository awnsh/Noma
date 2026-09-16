import type { IconComponent } from '../components/icons'
import {
  CodeGlyphIcon,
  BrowserGlyphIcon,
  AssistantGlyphIcon,
  MusicGlyphIcon,
  BranchGlyphIcon,
  TerminalGlyphIcon,
  FolderGlyphIcon,
  AppGlyphIcon
} from '../components/icons'

/**
 * The application -> icon resolution table, keyed by `applicationId`
 * exactly as it's produced everywhere else in the app: the lowercased
 * process name with `.exe` stripped (see `windowsAdapter.ts`'s
 * `toApplication()` and `seed.ts`'s `SEED_APPLICATIONS`) — `code`,
 * `chrome`, `claude`, `spotify`, plus the common Windows-shell processes a
 * real workflow chain will actually contain.
 *
 * Every entry is one of this app's own hand-drawn glyphs (see
 * `components/icons.tsx`) — never a real logo, never an OS-extracted
 * icon. An earlier version of this feature tried both; showing four
 * different brands' actual artwork next to this app's restrained line-icon
 * language looked like noise, not "alive," so this trades brand
 * recognition for visual evenness. `resolveAppIcon` always returns a
 * component — `AppGlyphIcon` is the deliberate catch-all for anything not
 * listed here, so no application ever falls back to a bare text initial.
 */
const APP_ICON_REGISTRY: Record<string, IconComponent> = {
  code: CodeGlyphIcon,
  chrome: BrowserGlyphIcon,
  claude: AssistantGlyphIcon,
  spotify: MusicGlyphIcon,
  github: BranchGlyphIcon,
  explorer: FolderGlyphIcon,
  windowsterminal: TerminalGlyphIcon,
  powershell: TerminalGlyphIcon,
  pwsh: TerminalGlyphIcon,
  cmd: TerminalGlyphIcon
}

export function resolveAppIcon(applicationId: string | null | undefined): IconComponent {
  if (!applicationId) return AppGlyphIcon
  return APP_ICON_REGISTRY[applicationId.toLowerCase()] ?? AppGlyphIcon
}
