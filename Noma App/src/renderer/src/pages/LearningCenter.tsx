import { useEffect, useState } from 'react'
import type { LearningStats, Suggestion, SuggestionStatus } from '@shared/types'
import { explainConfidence } from '../lib/explainConfidence'

const STATUS_STYLES: Record<SuggestionStatus, string> = {
  pending: 'border-white/10 text-neutral-400',
  accepted: 'border-accent-muted text-accent',
  rejected: 'border-red-900 text-red-400',
  dismissed: 'border-white/10 text-neutral-600'
}

function formatBias(bias: number): string {
  const percent = Math.round(bias * 100)
  if (percent === 0) return '±0%'
  return percent > 0 ? `+${percent}%` : `${percent}%`
}

function SuggestionHistoryRow({ suggestion }: { suggestion: Suggestion }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-white/10 bg-base-900 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-200">{suggestion.title}</div>
          <div className="mt-0.5 text-[11px] text-neutral-600">
            {suggestion.applicationId ?? 'unknown app'} ·{' '}
            {new Date(suggestion.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_STYLES[suggestion.status]}`}
          >
            {suggestion.status}
          </span>
          <span className="text-xs text-neutral-500">{Math.round(suggestion.confidence * 100)}%</span>
        </div>
      </div>
      {suggestion.confidenceBreakdown && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2 text-[11px] text-neutral-600 hover:text-accent"
          >
            {expanded ? 'Hide why' : 'Why?'}
          </button>
          {expanded && (
            <p className="mt-2 rounded-md border border-white/5 bg-base-950 px-3 py-2 text-xs leading-relaxed text-neutral-500">
              {explainConfidence(suggestion.confidenceBreakdown)}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export function LearningCenter() {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [history, setHistory] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = (): void => {
    Promise.all([window.flow.getLearningStats(), window.flow.getAllSuggestions()]).then(
      ([nextStats, nextHistory]) => {
        setStats(nextStats)
        setHistory(nextHistory)
        setIsLoading(false)
      }
    )
  }

  useEffect(() => {
    refresh()
    // Any suggestion resolving anywhere in the app (accept/reject/dismiss)
    // changes both the history list and the accept/reject counts behind
    // each kind's bias — re-fetch rather than trying to patch state locally.
    const unsubscribe = window.flow.onSuggestionsChanged(() => refresh())
    return unsubscribe
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-100">Flow Learning Center</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Flow is a local rule-based engine, not an AI model — every suggestion comes from counting
          real events against a fixed threshold, and every confidence percentage is real arithmetic.
          This page shows exactly what it's tracking.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-600">Loading…</p>
      ) : (
        <>
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats?.kinds.map((kind) => {
              const total = kind.accepted + kind.rejected
              return (
                <div key={kind.kind} className="rounded-xl border border-white/10 bg-base-900 p-4">
                  <div className="text-sm font-medium text-neutral-100">{kind.label}</div>
                  <p className="mt-1 text-xs text-neutral-500">{kind.description}</p>
                  <p className="mt-2 text-[11px] text-neutral-600">
                    Triggers a suggestion at {kind.threshold}+ occurrences in a day.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">
                      {total === 0
                        ? 'No suggestions of this kind resolved yet'
                        : `${kind.accepted} accepted / ${kind.rejected} rejected`}
                    </span>
                    <span
                      className={
                        kind.bias > 0
                          ? 'text-accent'
                          : kind.bias < 0
                            ? 'text-red-400'
                            : 'text-neutral-600'
                      }
                    >
                      {formatBias(kind.bias)} confidence bias
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
              Suggestion history
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No suggestions yet — Flow needs some repeated activity today before it has anything
                to suggest.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((suggestion) => (
                  <SuggestionHistoryRow key={suggestion.id} suggestion={suggestion} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
