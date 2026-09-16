// Ported from the real app's components/icons.tsx (the *_GlyphIcon exports)
// and lib/appIcons.ts's resolution table — the app deliberately replaced an
// earlier attempt at showing each app's own real logo with one consistent,
// hand-drawn glyph per application category, because four different brands'
// actual artwork next to the app's restrained line-icon language read as
// noise, not "alive" (see the app's own doc comment). This preview is meant
// to look like the real app, so it uses the app's real icon language here —
// unlike the rest of this marketing site, which deliberately does use real
// brand icons (AppIcon.tsx) for its own "look at all these apps" storytelling.
// The two are different components on purpose; don't merge them.

import type { ReactElement } from 'react'

type IconProps = { className?: string }
type IconComponent = (props: IconProps) => ReactElement

const BASE_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function TerminalGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M12 15h5" />
    </svg>
  )
}

function CodeGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M16 6l6 6-6 6M8 6l-6 6 6 6" />
    </svg>
  )
}

function BrowserGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 2.5 2.8 15.5 0 18M12 3c-2.8 2.5-2.8 15.5 0 18" />
    </svg>
  )
}

function AssistantGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5Z" />
    </svg>
  )
}

function MusicGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="2.7" />
      <circle cx="17" cy="16" r="2.7" />
    </svg>
  )
}

function BranchGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 7v10M18 10a8 8 0 0 1-8 8" />
    </svg>
  )
}

function AppGlyph({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Keyed by `appProfiles` id, exactly as the app's own registry is keyed by
// `applicationId` — every id not listed here falls back to the same
// catch-all glyph the real app uses, never a blank space or a text initial.
const REGISTRY: Record<string, IconComponent> = {
  vscode: CodeGlyph,
  chrome: BrowserGlyph,
  claude: AssistantGlyph,
  spotify: MusicGlyph,
  github: BranchGlyph,
  terminal: TerminalGlyph,
}

interface DemoAppIconProps {
  appId?: string | null
  name: string
  size?: number
  className?: string
  /** `'bare'`: just the mark. `'tile'`: wrapped in a rounded-square
   *  container — matches the real `AppIcon.tsx`'s two variants exactly. */
  variant?: 'bare' | 'tile'
}

/** The website-preview equivalent of the real app's `components/AppIcon.tsx` —
 *  same two variants, same fallback-to-catch-all behavior, re-themed onto
 *  this project's base tokens instead of the app's neutral/white ones. */
export default function DemoAppIcon({ appId, name, size = 20, className = '', variant = 'bare' }: DemoAppIconProps) {
  const Glyph = (appId && REGISTRY[appId]) || AppGlyph
  const dim = { width: size, height: size }
  const tileDim = { width: Math.round(size * 1.6), height: Math.round(size * 1.6) }
  const glyph = <Glyph className="h-[58%] w-[58%]" />

  return variant === 'tile' ? (
    <span
      role="img"
      aria-label={name}
      style={tileDim}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-base-600/60 bg-base-100/[0.04] text-base-300 ${className}`}
    >
      {glyph}
    </span>
  ) : (
    <span
      role="img"
      aria-label={name}
      style={dim}
      className={`flex shrink-0 items-center justify-center rounded-md bg-base-100/[0.06] text-base-300 ${className}`}
    >
      {glyph}
    </span>
  )
}
