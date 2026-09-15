import { formatAbsoluteTime } from '../lib/formatRelativeTime'

export interface ActivityEvent {
  id: string
  timestamp: number
  description: string
}

/**
 * One row in the Activity timeline — a small timestamp plus a plain
 * sentence. Carries only what a user needs to understand *that Noma did
 * something*, never raw per-keystroke detail — see Activity's own privacy
 * note.
 */
export function ActivityEventRow({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex gap-5 border-b border-base-700 py-3.5 last:border-b-0">
      <span className="w-14 shrink-0 pt-px text-xs tabular-nums text-neutral-500">
        {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </span>
      <p className="text-sm text-neutral-100" title={formatAbsoluteTime(event.timestamp)}>
        {event.description}
      </p>
    </div>
  )
}
