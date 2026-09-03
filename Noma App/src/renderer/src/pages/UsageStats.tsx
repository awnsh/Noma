import { useEffect, useState } from 'react'
import type { DailyActivityCount, ShortcutUsageStat } from '@shared/types'
import { formatShortcutCaption } from '../lib/describeAction'
import { formatAbsoluteTime, formatRelativeTime } from '../lib/formatRelativeTime'
import { DailyActivityChart } from '../components/DailyActivityChart'

const ACTIVITY_WINDOW_DAYS = 14

function ShortcutUsageRow({ stat }: { stat: ShortcutUsageStat }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-900 px-4 py-3">
      <div className="min-w-0">
        <div className="font-mono text-sm text-neutral-100">{formatShortcutCaption(stat.comboKeys)}</div>
        <div className="mt-0.5 truncate text-[11px] text-neutral-600">
          {stat.applicationName ?? 'Unknown application'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div
          className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-neutral-300"
          title={`Used ${stat.count} time${stat.count === 1 ? '' : 's'} since ${formatAbsoluteTime(stat.firstUsed)}`}
        >
          {stat.count}×
        </div>
        <div
          className="w-16 shrink-0 text-right text-[11px] text-neutral-600"
          title={formatAbsoluteTime(stat.lastUsed)}
        >
          {formatRelativeTime(stat.lastUsed)}
        </div>
      </div>
    </div>
  )
}

export function UsageStats() {
  const [stats, setStats] = useState<ShortcutUsageStat[] | null>(null)
  const [activity, setActivity] = useState<DailyActivityCount[] | null>(null)

  useEffect(() => {
    Promise.all([
      window.flow.getShortcutUsageStats(),
      window.flow.getDailyActivityCounts(ACTIVITY_WINDOW_DAYS)
    ]).then(([nextStats, nextActivity]) => {
      setStats(nextStats)
      setActivity(nextActivity)
    })
  }, [])

  const isLoading = stats === null || activity === null

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display text-xl font-semibold text-neutral-100">Usage Stats</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every keyboard shortcut Flow has recorded — how often you reach for it and when you used
          it last, across all of your captured activity, not just today.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-600">Loading…</p>
      ) : stats.length === 0 ? (
        <p className="text-sm text-neutral-600">
          No shortcuts recorded yet — enable workflow monitoring in Settings and Flow will start
          building this list from what you actually use.
        </p>
      ) : (
        <>
          <div className="mb-8">
            <DailyActivityChart data={activity} />
          </div>

          <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
            Shortcuts, most used first
          </div>
          <div className="space-y-2">
            {stats.map((stat) => (
              <ShortcutUsageRow key={stat.id} stat={stat} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
