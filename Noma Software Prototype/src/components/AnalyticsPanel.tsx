import { useMemo, useState } from 'react'
import { appProfiles } from '../data/appProfiles'
import { clearAllData, getAnalyticsSummary } from '../lib/analytics'
import { GLASS_CARD, MODAL_SCRIM } from '../lib/surfaces'

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

/** Section labels: Inter, not mono — mono here is reserved for the actual
 *  numeric readouts (counts, timestamps), which genuinely are technical/
 *  measurement content per DESIGN.md; a label like "Most-used controls"
 *  isn't, so it doesn't wear the mono costume. */
const LABEL = 'text-[10px] font-medium uppercase tracking-widest text-base-500'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-base-950/40 p-4">
      <div className={LABEL}>{label}</div>
      <div className="mt-1.5 font-mono text-xl text-base-50">{value}</div>
    </div>
  )
}

/**
 * Validation Mode (brief section 12) — hidden by design: no nav entry,
 * reachable only via Ctrl+Shift+V or the quiet dot in the footer (see
 * App.tsx). Reads straight from lib/analytics.ts's localStorage-backed
 * event log, so it reflects every session on this machine, not just the
 * current one — the intended way to read results back after 20-30 people
 * have each tried the prototype on the same laptop.
 */
export function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [refreshTick, setRefreshTick] = useState(0)
  const summary = useMemo(() => getAnalyticsSummary(), [refreshTick])
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <div className={MODAL_SCRIM} onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-base-700 bg-base-900 p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-base-50">Validation Mode</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-base-400 hover:border-white/20 hover:text-base-200">
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Sessions" value={String(summary.sessionCount)} />
          <Stat label="Avg. session" value={formatDuration(summary.avgDurationMs)} />
          <Stat label="Control presses" value={String(summary.totalControlPresses)} />
          <Stat label="Patterns recognized" value={String(summary.patternsRecognized)} />
          <Stat label="Explored 2+ apps" value={`${Math.round(summary.returningRate * 100)}%`} />
        </div>

        <div className={`mt-5 p-4 ${GLASS_CARD}`}>
          <div className={LABEL}>Most-used application</div>
          {summary.appUsage.length === 0 ? (
            <p className="mt-2 text-sm text-base-600">No presses logged yet.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {summary.appUsage.map(({ appId, count }) => {
                const max = summary.appUsage[0]?.count ?? 1
                return (
                  <div key={appId} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-base-300">
                      {appProfiles[appId as keyof typeof appProfiles]?.shortName ?? appId}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-800">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[11px] text-base-500">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className={`mt-4 p-4 ${GLASS_CARD}`}>
          <div className={LABEL}>Most-used controls</div>
          {summary.topControls.length === 0 ? (
            <p className="mt-2 text-sm text-base-600">No presses logged yet.</p>
          ) : (
            <ol className="mt-3 space-y-1.5 text-sm text-base-300">
              {summary.topControls.map((c, i) => (
                <li key={c.key} className="flex justify-between">
                  <span>
                    {i + 1}. {c.label} <span className="text-base-600">· {appProfiles[c.appId as keyof typeof appProfiles]?.shortName ?? c.appId}</span>
                  </span>
                  <span className="font-mono text-base-500">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={`mt-4 p-4 ${GLASS_CARD}`}>
          <div className={`${LABEL} text-flow`}>Most-recognized patterns</div>
          {summary.topPatterns.length === 0 ? (
            <p className="mt-2 text-sm text-base-600">No patterns recognized yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm text-base-300">
              {summary.topPatterns.map((p) => (
                <li key={p.label} className="flex justify-between gap-2">
                  <span className="truncate">{p.label}</span>
                  <span className="font-mono text-base-500">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`mt-4 p-4 ${GLASS_CARD}`}>
          <div className="flex items-center justify-between">
            <div className={LABEL}>Survey responses ({summary.survey.length})</div>
          </div>
          {summary.replaceBreakdown.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.replaceBreakdown.map((r) => (
                <span key={r.answer} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-base-300">
                  {r.answer} · {r.count}
                </span>
              ))}
            </div>
          )}
          {summary.survey.length === 0 ? (
            <p className="mt-2 text-sm text-base-600">No responses yet.</p>
          ) : (
            <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
              {summary.survey.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/[0.06] p-3 text-xs">
                  <div className="font-medium text-accent">{r.replace}</div>
                  {r.worth && <p className="mt-1 text-base-300"><span className="text-base-600">Worth $150+: </span>{r.worth}</p>}
                  {r.adaptTo && <p className="mt-1 text-base-300"><span className="text-base-600">Adapt to: </span>{r.adaptTo}</p>}
                  {r.missing && <p className="mt-1 text-base-300"><span className="text-base-600">Missing: </span>{r.missing}</p>}
                  <div className="mt-1.5 text-[10px] text-base-600">{new Date(r.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <button type="button" onClick={() => setRefreshTick((t) => t + 1)} className="text-xs text-base-500 hover:text-base-300">
            Refresh
          </button>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-500">Erase every session, event, and response?</span>
              <button
                type="button"
                onClick={() => {
                  clearAllData()
                  setConfirmClear(false)
                  setRefreshTick((t) => t + 1)
                }}
                className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-base-100 hover:bg-white/5"
              >
                Clear all data
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="text-xs text-base-600 hover:text-base-400">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="text-xs text-base-600 hover:text-red-400">
              Clear all data
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
