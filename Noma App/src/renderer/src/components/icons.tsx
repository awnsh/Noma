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

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...BASE_PROPS} className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v8a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-8" />
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
