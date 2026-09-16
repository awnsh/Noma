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
 * Tier 2 of `AppIcon`'s three-tier resolution (see that component's own
 * doc comment) — every entry here is one of this app's own hand-drawn
 * glyphs (see `components/icons.tsx`), used only once the real OS icon
 * (tier 1, `iconService.ts` via `useOsIcon`) is confirmed unavailable for
 * that application, not as the primary identity. `resolveAppIcon` always
 * returns a component — `AppGlyphIcon` is the deliberate catch-all (tier 3)
 * for anything not listed here, so no application ever falls back to a
 * bare text initial even before/without a real OS icon.
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
