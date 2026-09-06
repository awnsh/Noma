import type { ReactElement } from 'react'

/**
 * Minimal monoline glyphs for control tiles — same visual language as the
 * Noma Website's OledIcon.tsx (24x24, stroke-based, no fills except where a
 * shape is naturally solid). Extended here to cover every control in
 * data/appProfiles.ts rather than just the website's handful.
 */
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
  git: (
    <>
      <line x1="12" y1="3" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="21" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  format: <path d="M4 7h16M4 12h10M4 17h16" />,
  'go to definition': (
    <>
      <path d="M9 4H5v16h4" />
      <path d="M15 4h4v16h-4" />
      <path d="M9 12h6" />
      <path d="M12 9l3 3-3 3" />
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
  split: (
    <>
      <line x1="12" y1="4" x2="12" y2="20" />
      <path d="M7 8l-3 4 3 4" />
      <path d="M17 8l3 4-3 4" />
    </>
  ),
  undo: (
    <>
      <path d="M4 12a8 8 0 1 0 8-8" />
      <path d="M4 4v5h5" />
    </>
  ),
  redo: (
    <>
      <path d="M20 12a8 8 0 1 1-8-8" />
      <path d="M20 4v5h-5" />
    </>
  ),
  'play/pause': <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  zoom: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  'mark in': (
    <>
      <line x1="7" y1="4" x2="7" y2="20" />
      <path d="M7 8l8-4v8z" fill="currentColor" stroke="none" />
    </>
  ),
  'mark out': (
    <>
      <line x1="17" y1="4" x2="17" y2="20" />
      <path d="M17 8l-8-4v8z" fill="currentColor" stroke="none" />
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
  'close tab': (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
      <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
    </>
  ),
  'reopen tab': <path d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5M4.5 17v-5h5" />,
  bookmark: <path d="M7 4h10v16l-5-4-5 4z" />,
  previous: (
    <>
      <path d="M18 6l-9 6 9 6z" fill="currentColor" stroke="none" />
      <line x1="6" y1="6" x2="6" y2="18" />
    </>
  ),
  next: (
    <>
      <path d="M6 6l9 6-9 6z" fill="currentColor" stroke="none" />
      <line x1="18" y1="6" x2="18" y2="18" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <line x1="16" y1="9" x2="21" y2="15" />
      <line x1="21" y1="9" x2="16" y2="15" />
    </>
  ),
  like: (
    <path
      d="M12 20s-7-4.35-9.5-9C.8 7.5 3 4 6.5 4c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3 3.5 0 5.7 3.5 4 7-2.5 4.65-9.5 9-9.5 9z"
      fill="currentColor"
      stroke="none"
    />
  ),
  deafen: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </>
  ),
  'push to talk': (
    <>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </>
  ),
  'next channel': <path d="M6 9l6 6 6-6" />,
  'previous channel': <path d="M6 15l6-6 6 6" />,
  bold: <path d="M7 4h6a3.5 3.5 0 0 1 0 7H7zM7 11h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: (
    <>
      <line x1="14" y1="4" x2="9" y2="20" />
      <line x1="9" y1="4" x2="16" y2="4" />
      <line x1="6" y1="20" x2="13" y2="20" />
    </>
  ),
  underline: (
    <>
      <path d="M6 4v7a6 6 0 0 0 12 0V4" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </>
  ),
  heading: <path d="M6 4v16M18 4v16M6 12h12" />,
  'ai assist': (
    <path d="M12 3l1.8 4.9L18.5 9l-4.7 1.9L12 15l-1.8-4.1L5.5 9l4.7-1.1L12 3z" />
  ),
}

const fallback = <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />

/** A control's glyph, looked up by its label (case-insensitive). Falls back
 *  to a plain dot for anything not in the map above, rather than throwing —
 *  keeps this file additive as new controls get authored. */
export function ControlIcon({ label, className = '' }: { label: string; className?: string }) {
  const glyph = paths[label.toLowerCase()] ?? fallback

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  )
}
