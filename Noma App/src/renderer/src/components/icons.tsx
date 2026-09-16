/**
 * The sidebar's icon set — hand-drawn inline SVGs rather than an icon
 * library dependency, matching the rest of the app's "no unnecessary
 * dependency" posture. One shared stroke style (round caps/joins,
 * currentColor) so they read as one consistent set, not eight different
 * icon styles glued together.
 */

import type { ReactElement } from 'react'

type IconProps = { className?: string }
export type IconComponent = (props: IconProps) => ReactElement

const BASE_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v8a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-8" />
    </svg>
  )
}

/** Controls — a simple 2x2 button grid, distinct from KeyboardIcon's full
 *  keyboard (that's the Virtual Keyboard page's own, busier icon). */
export function ControlsIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

/** Activity — a short timeline of events, distinct from StatsIcon's bar
 *  chart (Usage Stats' own icon). */
export function ActivityIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M4 6h16M4 12h10M4 18h13" />
      <circle cx="19" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function DemoIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function KeyboardIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M6.5 13.5h.01M10 13.5h11" />
    </svg>
  )
}

export function MacroIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M13 3 5 13.5h5.5L10 21l8-10.5h-5.5L13 3Z" />
    </svg>
  )
}

export function LearningIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M9 18h6" />
      <path d="M9.5 15.5C7.5 14.2 6.5 12.6 6.5 10.5a5.5 5.5 0 0 1 11 0c0 2.1-1 3.7-3 5-.4.3-.6.7-.6 1.2v.3h-4.8v-.3c0-.5-.2-.9-.6-1.2Z" />
      <path d="M10 21h4" />
    </svg>
  )
}

export function StatsIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M7.5 20v-6" />
      <path d="M12 20v-9.5" />
      <path d="M16.5 20V7" />
    </svg>
  )
}

export function ProfilesIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.7-4 3.6-6 7.5-6s6.8 2 7.5 6" />
    </svg>
  )
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M4 7h9M17 7h3M4 12h3M9 12h11M4 17h13M20 17h0" />
      <circle cx="15" cy="7" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="17" cy="17" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function DeveloperIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M7 9.5 10 12l-3 2.5" />
      <path d="M13 14.5h4" />
    </svg>
  )
}

/**
 * The "Noma learned/noticed something" mark — a small four-point sparkle,
 * always paired with gold (see tailwind.config.js's color philosophy
 * comment). Reserved for genuine intelligence moments (NomaMoment,
 * LearnedActionCard) — never sprinkled next to every feature just because
 * it's software.
 */
export function SparkleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3c.5 3.2 1.3 5 2.6 6.4C16 10.7 17.8 11.5 21 12c-3.2.5-5 1.3-6.4 2.6C13.3 16 12.5 17.8 12 21c-.5-3.2-1.3-5-2.6-6.4C8 13.3 6.2 12.5 3 12c3.2-.5 5-1.3 6.4-2.6C10.7 8 11.5 6.2 12 3Z" />
    </svg>
  )
}

/** Holo — a tap's ripple, since there's no hardware to draw: concentric
 *  rings expanding from a point, echoing a desk-tap's own physical effect. */
export function HoloIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="9" strokeOpacity="0.5" />
    </svg>
  )
}

/**
 * The application icon set — one consistent, hand-drawn glyph per known
 * application *category* (a code editor, a browser, an AI assistant, a
 * terminal...), all in this file's shared stroke language, deliberately
 * replacing an earlier attempt at showing each app's own real logo/OS
 * icon. Real logos are different weights, different fills, different
 * silhouette complexity from four different brand systems side by side —
 * next to this app's restrained line-icon language they read as visual
 * noise, not "alive." This set trades brand recognition for evenness:
 * every application Noma shows gets a same-weight, same-style glyph, so a
 * workflow chain or a control grid reads as one considered object instead
 * of a logo soup. `AppGlyphIcon` is the deliberate catch-all — every
 * application has *some* icon here, never a bare monogram letter — see
 * `lib/appIcons.ts`'s registry for the applicationId -> icon mapping.
 */
export function TerminalGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M12 15h5" />
    </svg>
  )
}

export function FolderGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M3 7a1 1 0 0 1 1-1h4.5l2 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

/** A code editor (VS Code and friends) — the classic "code" bracket pair. */
export function CodeGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M16 6l6 6-6 6M8 6l-6 6 6 6" />
    </svg>
  )
}

/** A browser (Chrome and friends) — a globe: a circle, an equator, and one
 *  meridian, the universal "the web" pictogram. */
export function BrowserGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 2.5 2.8 15.5 0 18M12 3c-2.8 2.5-2.8 15.5 0 18" />
    </svg>
  )
}

/** A conversational AI assistant (Claude and friends) — a speech bubble,
 *  never a sparkle (see `SparkleIcon`'s own doc comment on why sparkles
 *  are reserved elsewhere, not a generic "this is AI" marker). */
export function AssistantGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5Z" />
    </svg>
  )
}

/** A music app (Spotify and friends) — a paired eighth note. */
export function MusicGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="2.7" />
      <circle cx="17" cy="16" r="2.7" />
    </svg>
  )
}

/** Source-code hosting (GitHub and friends) — a branch/fork glyph. */
export function BranchGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 7v10M18 10a8 8 0 0 1-8 8" />
    </svg>
  )
}

/** The catch-all for any application Noma doesn't recognize a category
 *  for — a plain, neutral window, never blank and never a text initial. */
export function AppGlyphIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
