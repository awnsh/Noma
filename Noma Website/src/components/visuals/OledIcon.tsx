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
  split: (
    <>
      <rect x="3.5" y="6" width="7" height="12" rx="1.3" />
      <rect x="13.5" y="6" width="7" height="12" rx="1.3" />
    </>
  ),
  'ripple delete': (
    <>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6.5" opacity="0.6" />
      <circle cx="12" cy="12" r="10.5" opacity="0.3" />
    </>
  ),
  undo: <path d="M7 7L3 11l4 4M3 11h10a6 6 0 1 1 -6 6" />,
  brush: (
    <>
      <path d="M15.5 4.5l4 4-8.5 8.5-5 1 1-5z" />
      <circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  erase: (
    <>
      <rect x="4" y="9" width="12" height="7" rx="1.4" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <line x1="15" y1="9" x2="19.5" y2="13.5" />
    </>
  ),
  commit: (
    <>
      <line x1="12" y1="3" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="21" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  push: <path d="M12 20V6M6 11l6-6 6 6" />,
  pull: <path d="M12 4v14M6 13l6 6 6-6" />,
  issues: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  open: <path d="M9 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4M13 4h7v7M20 4l-9 9" />,
  merge: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M6 8.2V15M6 15c0-3.5 3-5 8-5h2.2" />
    </>
  ),
  screenshot: (
    <>
      <path d="M4 8V6a1.5 1.5 0 0 1 1.5-1.5H7M20 8V6a1.5 1.5 0 0 0-1.5-1.5H17M4 16v2A1.5 1.5 0 0 0 5.5 19.5H7M20 16v2a1.5 1.5 0 0 1-1.5 1.5H17" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  prompt: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5Z" />
    </>
  ),
  paste: (
    <>
      <rect x="7" y="5" width="10" height="15" rx="1.3" />
      <rect x="9.5" y="3" width="5" height="3" rx="0.8" />
    </>
  ),
  'new chat': (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5Z" />
      <line x1="9" y1="8.7" x2="15" y2="8.7" />
      <line x1="9" y1="11.5" x2="13" y2="11.5" />
    </>
  ),
  send: <path d="M4.5 12l15-7.5-6 15-2.5-6-6.5-1.5z" />,
  frame: (
    <>
      <path d="M7 3v14M17 7v14M3 7h14M7 17h14" />
    </>
  ),
  component: (
    <>
      <path d="M12 3l4 4-4 4-4-4z" />
      <path d="M4 12l4-4v8z" />
      <path d="M20 12l-4-4v8z" />
      <path d="M12 21l-4-4h8z" />
    </>
  ),
  comment: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z" />
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
