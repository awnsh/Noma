/**
 * A short, glanceable "how long ago" string for a timestamp — "Just now",
 * "12m ago", "3h ago", "Yesterday", "5d ago", then falls back to a plain
 * short date once it's far enough back that a relative count stops being
 * useful. Pair with `formatAbsoluteTime` in a `title` attribute so the exact
 * moment is always one hover away.
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return 'Just now'

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`

  const diffDay = Math.round(diffHour / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`

  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The full, unambiguous date & time — the `title` tooltip companion to
 *  `formatRelativeTime`. */
export function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}
