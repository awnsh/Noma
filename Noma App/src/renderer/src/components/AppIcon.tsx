import { resolveAppIcon } from '../lib/appIcons'

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
}

/**
 * The one place in the app that turns an application into a visual mark —
 * every call site (`WorkflowChain`, `ControlTile`, `LearnedActionCard`,
 * every "current application" indicator) goes through this instead of
 * rendering its own icon logic. Always a hand-drawn glyph from this app's
 * own icon language (see `lib/appIcons.ts`) at a consistent weight — never
 * a real brand logo, never an OS-extracted icon, never a bare text
 * initial. The point is evenness: every application Noma shows gets the
 * same kind of mark, so a workflow chain reads as one considered object
 * instead of a row of mismatched brand artwork.
 */
export function AppIcon({ applicationId, name, size = 20, className = '', variant = 'bare' }: AppIconProps) {
  const Glyph = resolveAppIcon(applicationId)
  const dim = { width: size, height: size }
  const tileDim = { width: Math.round(size * 1.6), height: Math.round(size * 1.6) }
  const glyph = <Glyph className="h-[58%] w-[58%]" />

  return variant === 'tile' ? (
    <span
      role="img"
      aria-label={name}
      style={tileDim}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] text-neutral-300 ${className}`}
    >
      {glyph}
    </span>
  ) : (
    <span
      role="img"
      aria-label={name}
      style={dim}
      className={`flex shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-neutral-300 ${className}`}
    >
      {glyph}
    </span>
  )
}
