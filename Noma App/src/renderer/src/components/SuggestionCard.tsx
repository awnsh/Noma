import { useState } from 'react'
import type { ApplicationProfile, Suggestion } from '@shared/types'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { explainConfidence } from '../lib/explainConfidence'

interface SuggestionCardProps {
  suggestion: Suggestion
  onReject: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionCard({ suggestion, onReject, onDismiss }: SuggestionCardProps) {
  const [isPicking, setIsPicking] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [profile, setProfile] = useState<ApplicationProfile | null | undefined>(undefined)
  const assignToControl = useSuggestionsStore((state) => state.assignToControl)
  const resolve = useSuggestionsStore((state) => state.resolve)

  const confidencePercent = Math.round(suggestion.confidence * 100)

  const startPicking = async (): Promise<void> => {
    setIsPicking(true)
    if (!suggestion.applicationId) {
      setProfile(null)
      return
    }
    const result = await window.flow.getProfileForApplication(suggestion.applicationId)
    setProfile(result)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-base-900 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-neutral-100">{suggestion.title}</div>
          <p className="mt-1 text-sm text-neutral-400">{suggestion.explanation}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-neutral-500"
            title="Confidence"
          >
            {confidencePercent}%
          </div>
          {suggestion.confidenceBreakdown && (
            <button
              type="button"
              onClick={() => setShowWhy((prev) => !prev)}
              className="text-[10px] text-neutral-600 hover:text-accent"
            >
              {showWhy ? 'Hide why' : 'Why?'}
            </button>
          )}
        </div>
      </div>

      {showWhy && suggestion.confidenceBreakdown && (
        <p className="mt-2 rounded-lg border border-white/5 bg-base-950 px-3 py-2 text-xs leading-relaxed text-neutral-500">
          {explainConfidence(suggestion.confidenceBreakdown)}
        </p>
      )}

      {!isPicking ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void startPicking()}
            className="rounded-md border border-accent-muted bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onReject(suggestion.id)}
            className="rounded-md border border-white/10 px-3 py-1 text-xs text-neutral-400 hover:border-white/30 hover:text-neutral-200"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onDismiss(suggestion.id)}
            className="rounded-md px-3 py-1 text-xs text-neutral-600 hover:text-neutral-400"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-white/10 bg-base-950 p-3">
          {profile === undefined && (
            <p className="text-xs text-neutral-500">Loading controls…</p>
          )}

          {profile === null && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                No profile configured for this application yet, so there's nowhere to assign it.
                Accepting just remembers your preference.
              </p>
              <button
                type="button"
                onClick={() => void resolve(suggestion.id, 'accepted')}
                className="shrink-0 rounded-md border border-accent-muted bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
              >
                Accept
              </button>
            </div>
          )}

          {profile && (
            <>
              <p className="mb-2 text-xs text-neutral-500">
                Assign to which control? This replaces whatever is currently there.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => {
                  const control = profile.controls.find((item) => item.slot === slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => void assignToControl(suggestion.id, slot)}
                      className="rounded-md border border-white/10 bg-base-900 px-2 py-2 text-center text-xs text-neutral-300 hover:border-accent-muted hover:text-neutral-100"
                    >
                      <div className="text-[9px] uppercase tracking-widest text-neutral-600">
                        {slot}
                      </div>
                      <div className="mt-0.5 truncate">{control?.label ?? '—'}</div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsPicking(false)}
            className="mt-2 text-xs text-neutral-600 hover:text-neutral-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
