// The website-preview equivalent of the real app's `components/AppIcon.tsx`.
//
// Updated 2026-09-17: the real app used to show one consistent hand-drawn
// glyph per application (a deliberate choice at the time — see git history
// for the old REGISTRY of *_Glyph components this file used to re-export).
// That decision was reversed in the real app: it now resolves each
// application's actual OS-extracted icon as its primary identity, falling
// back to a hand-drawn glyph only on the rare occasion the OS has nothing
// to give it. A static marketing site can't call a live OS icon API, so the
// closest faithful equivalent here is this site's own real-brand-icon
// component (`AppIcon.tsx`, already used elsewhere on the site for exactly
// this — Problem/Applications/Holo's "look at all these real apps"
// sections) — real logo where `simple-icons` still carries one, a short
// letterform badge otherwise (see that file's own doc comment for exactly
// which apps fell into the badge tier and why). This preview and the rest
// of the site now share one icon language on purpose, which they didn't
// before — the two only diverged because the real app's own icon strategy
// used to diverge from "show the real logo," and it no longer does.

import type { ReactElement } from 'react'
import RealAppIcon from './AppIcon'
import { appProfiles } from '../../data/appProfiles'

interface DemoAppIconProps {
  appId?: string | null
  name: string
  size?: number
  className?: string
  /** `'bare'`: just the mark. `'tile'`: wrapped in a rounded-square
   *  container — matches the real `AppIcon.tsx`'s two variants exactly. */
  variant?: 'bare' | 'tile'
  /** `'bare'` only: renders the mark at ~92% of `size` instead of the
   *  default ~60%, and drops the small inset background — matches the real
   *  app's `AppIcon.tsx` `fill` prop, for a caller (`DemoWorkflowChain`'s
   *  icon chip) that already wraps this in its own sized container and
   *  wants the icon to actually fill it. */
  fill?: boolean
}

/** The one generic catch-all, for the rare step with no resolved
 *  application at all (never a blank space or a bare text initial) — same
 *  role the real app's own `AppGlyphIcon` fallback plays. */
function GenericGlyph({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function DemoAppIcon({ appId, name, size = 20, className = '', variant = 'bare', fill = false }: DemoAppIconProps) {
  const color = appId ? appProfiles[appId]?.color : undefined
  // The letterform-badge fallback inside `RealAppIcon` (e.g. "Pr", "SW" for
  // an app `simple-icons` doesn't carry) has no font-size of its own — it
  // inherits. Folding `fontSize` into the same style object as the
  // container's own explicit pixel size (rather than a separate wrapping
  // element) matters here: an extra flex child with no definite height
  // would break the real icon's percentage sizing, which only resolves
  // correctly against a direct, definitely-sized parent — exactly what
  // this container already is.
  const fontScale = fill ? 0.56 : 0.4
  const dim = { width: size, height: size, fontSize: Math.round(size * fontScale) }
  const tileDim = { width: Math.round(size * 1.6), height: Math.round(size * 1.6), fontSize: Math.round(size * fontScale) }
  const insetClass = fill ? 'h-[92%] w-[92%]' : 'h-[62%] w-[62%]'
  const icon = appId ? (
    <RealAppIcon id={appId} color={color} className={insetClass} />
  ) : (
    <GenericGlyph className={fill ? 'h-[80%] w-[80%]' : 'h-[58%] w-[58%]'} />
  )

  return variant === 'tile' ? (
    <span
      role="img"
      aria-label={name}
      style={tileDim}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-base-600/60 bg-base-100/[0.04] text-base-300 ${className}`}
    >
      {icon}
    </span>
  ) : (
    <span
      role="img"
      aria-label={name}
      style={dim}
      className={`flex shrink-0 items-center justify-center text-base-300 ${fill ? '' : 'rounded-md bg-base-100/[0.06]'} ${className}`}
    >
      {icon}
    </span>
  )
}
