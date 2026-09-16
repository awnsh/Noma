import { resolveAppIcon } from '../lib/appIcons'
import { useApplicationsStore } from '../stores/applicationsStore'
import { useOsIcon } from '../lib/osIconCache'

interface AppIconProps {
  /** The real `applicationId` (`code`, `chrome`, `claude`, ...) when known —
   *  `undefined`/`null` (an app Noma hasn't identified) still resolves to
   *  the generic catch-all glyph, never a blank space. */
  applicationId?: string | null
  /** The display name — used only as the icon's accessible label. */
  name: string
  size?: number
  className?: string
  /** `'bare'` (default): just the mark, for inline/compact contexts
   *  (`WorkflowChain`'s chips, an inline "current app" line). `'tile'`:
   *  wraps it in a subtle rounded-square container for a standalone
   *  control/workflow card where the icon needs to read as the card's own
   *  visual anchor. */
  variant?: 'bare' | 'tile'
  /** `'bare'` only: renders the mark at ~92% of `size` instead of the
   *  default 68%/58%, and drops the small inset background — for a caller
   *  that already wraps this in its own sized container (e.g.
   *  `WorkflowChain`'s icon chip) and wants the icon to actually fill it,
   *  not float in the middle with a visible ring of empty space. The
   *  default (smaller, own-background) sizing stays right for every inline
   *  use that isn't already sitting in a purpose-built box. */
  fill?: boolean
}

/**
 * The one place in the app that turns an application into a visual mark —
 * every call site (`WorkflowChain`, `ControlTile`, `LearnedActionCard`,
 * every "current application" indicator) goes through this instead of
 * rendering its own icon logic.
 *
 * Three tiers, in order, never skipping a tier when a higher one is
 * available:
 *  1. The real OS-extracted icon (`useOsIcon`, backed by `iconService.ts`'s
 *     `app.getFileIcon` in the main process) — an actual `<img>` of that
 *     exact application's real icon, works for *any* installed
 *     application, not just ones this app happens to have a hand-drawn
 *     glyph for. This is what makes "arbitrary application" support real
 *     rather than aspirational.
 *  2. This app's own hand-drawn glyph (`lib/appIcons.ts`'s small curated
 *     registry) — used only while the real icon is still loading, or once
 *     it's confirmed unavailable (no `executablePath` on record yet, or
 *     the OS couldn't resolve one).
 *  3. The generic catch-all glyph (`AppGlyphIcon`, `resolveAppIcon`'s own
 *     fallback) — so no application ever falls back to a bare text
 *     initial or an empty box.
 *
 * The executable path itself is resolved from `applicationId` via
 * `useApplicationsStore` (see that store's doc comment) rather than a
 * prop, so every existing call site keeps working unchanged.
 */
export function AppIcon({ applicationId, name, size = 20, className = '', variant = 'bare', fill = false }: AppIconProps) {
  const executablePath = useApplicationsStore((state) =>
    applicationId ? state.byId[applicationId]?.executablePath : undefined
  )
  const osIcon = useOsIcon(executablePath)
  const Glyph = resolveAppIcon(applicationId)

  const dim = { width: size, height: size }
  const tileDim = { width: Math.round(size * 1.6), height: Math.round(size * 1.6) }
  const inset = fill ? '92%' : '68%'

  const content = osIcon ? (
    <img src={osIcon} alt="" style={{ width: inset, height: inset, objectFit: 'contain' }} className="rounded-[3px]" />
  ) : (
    <Glyph className={fill ? 'h-[80%] w-[80%]' : 'h-[58%] w-[58%]'} />
  )

  return variant === 'tile' ? (
    <span
      role="img"
      aria-label={name}
      style={tileDim}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] text-neutral-300 ${className}`}
    >
      {content}
    </span>
  ) : (
    <span
      role="img"
      aria-label={name}
      style={dim}
      className={`flex shrink-0 items-center justify-center text-neutral-300 ${fill ? '' : 'rounded-md bg-white/[0.06]'} ${className}`}
    >
      {content}
    </span>
  )
}
