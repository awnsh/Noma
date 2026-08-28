import type { ReactElement } from 'react'

/** Minimal monoline glyphs rendered inside OLED control cells. Keyed by control label (case-insensitive). */
const paths: Record<string, ReactElement> = {
  run: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  debug: (
    <>
      <circle cx="12" cy="13" r="6" />
      <circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 3v4M7 6l2 2M17 6l-2 2" />
    </>
  ),
  terminal: (
    <>
      <path d="M5 7l5 5-5 5" />
      <line x1="12" y1="17" x2="19" y2="17" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <line x1="15" y1="15" x2="20" y2="20" />
    </>
  ),
  cut: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <line x1="7.8" y1="7.3" x2="20" y2="17" />
      <line x1="7.8" y1="16.7" x2="20" y2="7" />
    </>
  ),
  ripple: (
    <>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6.5" opacity="0.6" />
      <circle cx="12" cy="12" r="10.5" opacity="0.3" />
    </>
  ),
  zoom: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  export: (
    <>
      <path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </>
  ),
  rotate: <path d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5M4.5 17v-5h5" />,
  measure: (
    <>
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="7" y1="9" x2="7" y2="15" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="17" y1="9" x2="17" y2="15" />
    </>
  ),
  extrude: (
    <>
      <path d="M4 8l8-4 8 4-8 4-8-4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <line x1="12" y1="12" x2="12" y2="20" />
    </>
  ),
  save: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="1.2" />
      <rect x="8" y="4" width="8" height="5" />
      <rect x="8" y="14" width="8" height="6" />
    </>
  ),
  back: <path d="M15 5.5l-7 6.5 7 6.5" />,
  forward: <path d="M9 5.5l7 6.5-7 6.5" />,
  'new tab': (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </>
  ),
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  'command palette': (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
  ),
  'git commit': (
    <>
      <line x1="12" y1="3" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="21" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
}

const fallback = <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />

export default function OledIcon({ label, className = '' }: { label: string; className?: string }) {
  const glyph = paths[label.toLowerCase()] ?? fallback

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {glyph}
    </svg>
  )
}
