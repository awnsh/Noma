import type { DeviceLogEntry } from '@shared/types'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour12: false })
}

export function DeviceLogRow({ entry }: { entry: DeviceLogEntry }) {
  const isOutgoing = entry.direction === 'toDevice'

  return (
    <div className="flex items-baseline gap-2 border-b border-white/5 px-3 py-1.5 text-xs last:border-b-0">
      <span className="shrink-0 font-mono text-neutral-700">{formatTime(entry.timestamp)}</span>
      <span
        className={`shrink-0 ${isOutgoing ? 'text-accent-muted' : 'text-accent'}`}
        title={isOutgoing ? 'HOST → DEVICE' : 'DEVICE → HOST'}
      >
        {isOutgoing ? '→' : '←'}
      </span>
      <span className="shrink-0 font-mono text-neutral-300">{entry.type}</span>
      {entry.detail && <span className="truncate text-neutral-600">{entry.detail}</span>}
    </div>
  )
}
