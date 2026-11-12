// Waitlist form endpoint (Formspree).
//
// 1. Create a free account at https://formspree.io and add a new form.
// 2. Copy its endpoint — looks like https://formspree.io/f/xxxxxxxx
// 3. Paste it below. That's it; no other code changes needed.
//
// Until this is set, the waitlist form renders normally but shows a small
// "not connected yet" notice instead of submitting.
export const WAITLIST_ENDPOINT = 'https://formspree.io/f/xljedono'

// Issue reports from /feedback. Shares the waitlist's Formspree form for now;
// each report's subject starts "Noma issue report" so they're easy to tell
// apart. To keep them separate, add a second form in Formspree and paste its
// endpoint here instead.
export const FEEDBACK_ENDPOINT = WAITLIST_ENDPOINT

// Where to follow the build (2026-11-12, keyboard site). Placeholders until
// the channels exist: an entry with an empty href renders as "soon" rather
// than a dead link. Paste the real URL in to make it live.
export const BUILD_LINKS: { label: string; href: string }[] = [
  { label: 'Build log', href: '' },
  { label: 'YouTube', href: '' },
  { label: 'X', href: '' },
]
