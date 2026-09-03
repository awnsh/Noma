import { useState } from 'react'
import type { DailyActivityCount } from '@shared/types'

/**
 * A minimal bar chart of shortcut presses per day — single series (there's
 * only one metric here), so no legend is needed and the app's own accent
 * blue carries the whole thing; identity is never in question the way it
 * would be with multiple series. Hand-rolled div bars rather than a
 * charting library, matching the app's existing "no unnecessary dependency"
 * posture (see icons.tsx).
 */
export function DailyActivityChart({ data }: { data: DailyActivityCount[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((day) => day.count))

  return (
    <div className="rounded-xl border border-white/10 bg-base-900 p-4">
      <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
        Shortcut activity, last {data.length} days
      </div>
      <div className="flex h-24 items-end gap-[3px]">
        {data.map((day, index) => {
          // A floor so a genuine zero day still renders a visible sliver —
          // an invisible 0px bar reads as "missing data," not "no activity."
          const heightPercent = Math.max(4, (day.count / max) * 100)
          const isHovered = hoveredIndex === index
          return (
            <div
              key={day.date}
              className="group relative flex-1"
              onPointerEnter={() => setHoveredIndex(index)}
              onPointerLeave={() => setHoveredIndex(null)}
            >
              {isHovered && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-base-800 px-2 py-1 text-[11px] text-neutral-100 shadow-lg shadow-black/40">
                  <span className="text-neutral-400">{formatChartDate(day.date)}</span>{' '}
                  <span className="font-medium">
                    {day.count} {day.count === 1 ? 'use' : 'uses'}
                  </span>
                </div>
              )}
              <div
                className={`w-full rounded-t-[3px] transition-colors ${
                  day.count === 0 ? 'bg-white/[0.06]' : isHovered ? 'bg-accent' : 'bg-accent/70'
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-neutral-600">
        <span>{formatChartDate(data[0]?.date)}</span>
        <span>{formatChartDate(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  )
}

function formatChartDate(dateKey: string | undefined): string {
  if (!dateKey) return ''
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}
