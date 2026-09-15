import { useState } from 'react'
import type { ApplicationProfile, Suggestion } from '@shared/types'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { explainConfidence } from '../lib/explainConfidence'
import { confidenceLabel } from '../lib/confidenceLabel'
import { workflowChainSteps } from '../lib/workflowChain'
import { formatAbsoluteTime, formatRelativeTime } from '../lib/formatRelativeTime'
import { WorkflowChain } from './WorkflowChain'

/**
 * The Noma Moment — the single most important component in the app: "Noma
 * noticed something you do repeatedly." One reusable component for every
 * learned-workflow suggestion, wherever it needs to appear (Home's hero
 * slot, the Controls page's suggestion list, Demo Mode).
 *
 * Deliberately undecorated: no card, no glow, no icon marking it as "AI" —
 * the emphasis comes entirely from typography and spacing, and the
 * workflow sequence itself is the one visually interesting element (see
 * `WorkflowChain`). The primary row is a confident, two-choice moment
 * (Create action / Not now); the feedback/explain affordances a person
 * only wants occasionally ("Why?", "Not useful") sit behind a single quiet
 * "More" toggle rather than crowding the main decision — see product
 * brief section 6, "remove prototype-like copy."
 *
 * `variant="hero"` is the large Home-page presentation; `variant="compact"`
 * is the same component sized down for a list context. Internal state
 * machine: idle -> picking (choosing which control slot) -> success
 * (confirms what was actually created) — `picking`'s slot choice is a real
 * `assignSuggestionToControl` call, and `success` only renders once that
 * call actually returns a control.
 */
interface NomaMomentProps {
  suggestion: Suggestion
  variant?: 'hero' | 'compact'
  onReject: (id: string) => void
  onDismiss: (id: string) => void
  /** Fires once an action was actually created (or, for an informational
   *  suggestion, actually acknowledged) — after the real IPC call
   *  succeeds, never speculatively. Optional; Demo Mode uses it to advance
   *  its own scripted narrative once the real assignment lands. */
  onCreated?: (label: string) => void
}

function occurrenceSentence(suggestion: Suggestion): string {
  const count = suggestion.confidenceBreakdown?.occurrenceCount
  if (count === undefined) return suggestion.explanation
  const where = suggestion.applicationName ? ` in ${suggestion.applicationName}` : ''
  return `You've repeated this workflow ${count} time${count === 1 ? '' : 's'}${where}.`
}

export function NomaMoment({
  suggestion,
  variant = 'compact',
  onReject,
  onDismiss,
  onCreated
}: NomaMomentProps) {
  const [isPicking, setIsPicking] = useState(false)
  const [profile, setProfile] = useState<ApplicationProfile | null | undefined>(undefined)
  const [showMore, setShowMore] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [createdLabel, setCreatedLabel] = useState<string | null>(null)
  const assignToControl = useSuggestionsStore((state) => state.assignToControl)
  const resolve = useSuggestionsStore((state) => state.resolve)

  const isHero = variant === 'hero'
  const chain = workflowChainSteps(suggestion)

  const startPicking = async (): Promise<void> => {
    setIsPicking(true)
    if (!suggestion.applicationId) {
      setProfile(null)
      return
    }
    const result = await window.flow.getProfileForApplication(suggestion.applicationId)
    setProfile(result)
  }

  const handleAssign = async (slot: number): Promise<void> => {
    const label = profile?.controls.find((control) => control.slot === slot)?.label
    const ok = await assignToControl(suggestion.id, slot)
    if (ok) {
      setCreatedLabel(label ?? null)
      if (label) onCreated?.(label)
    }
  }

  const handleAcceptInformational = async (): Promise<void> => {
    await resolve(suggestion.id, 'accepted')
    setCreatedLabel('Noted')
    onCreated?.('Noted')
  }

  // Success: something real was actually created (or, for an
  // informational-only suggestion, actually acknowledged) — never shown
  // speculatively.
  if (createdLabel) {
    return (
      <div style={{ animation: 'noma-settle 350ms ease-out' }}>
        <p className="text-xs text-neutral-600">Action created</p>
        <p className={`mt-1.5 font-display font-semibold text-neutral-100 ${isHero ? 'text-2xl' : 'text-lg'}`}>
          {createdLabel === 'Noted' ? 'Noted' : createdLabel}
        </p>
        <p className="mt-1.5 text-sm text-neutral-500">
          {createdLabel === 'Noted'
            ? "Noma will keep this in mind — it'll factor into what it suggests next."
            : 'Added to your interface.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className={`font-display font-semibold text-neutral-100 ${isHero ? 'text-2xl' : 'text-base'}`}>
        Noma noticed
      </p>

      <p className={`text-neutral-600 ${isHero ? 'mt-2 text-base leading-relaxed' : 'mt-1 text-sm'}`}>
        {occurrenceSentence(suggestion)}
      </p>

      {chain && chain.length > 1 && (
        <div className={isHero ? 'mt-5' : 'mt-3'}>
          <WorkflowChain steps={chain} size={isHero ? 'lg' : 'md'} />
        </div>
      )}

      {!isPicking ? (
        <>
          <p className={`text-neutral-100 ${isHero ? 'mt-6 text-base' : 'mt-3 text-sm'}`}>
            {suggestion.action ? 'Turn this into one action?' : 'Worth remembering for next time?'}
          </p>
          <div className={`flex items-center gap-4 ${isHero ? 'mt-3' : 'mt-2'}`}>
            <button
              type="button"
              onClick={() => void startPicking()}
              className={`rounded-md bg-accent font-medium text-white transition-opacity duration-150 hover:opacity-90 active:opacity-80 ${
                isHero ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
              }`}
            >
              {suggestion.action ? 'Create action' : 'Sounds right'}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(suggestion.id)}
              className={`text-neutral-500 hover:text-neutral-100 ${isHero ? 'text-sm' : 'text-xs'}`}
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              className="ml-auto text-[11px] text-neutral-400 hover:text-neutral-600"
            >
              More
            </button>
          </div>

          {showMore && (
            <div className="mt-2.5 flex items-center gap-3 text-xs text-neutral-500">
              {suggestion.confidenceBreakdown && (
                <button type="button" onClick={() => setShowWhy((prev) => !prev)} className="hover:text-neutral-100">
                  {showWhy ? 'Hide why' : 'Why Noma suggested this'}
                </button>
              )}
              <button type="button" onClick={() => onReject(suggestion.id)} className="hover:text-neutral-100">
                Not useful
              </button>
            </div>
          )}
          {showMore && showWhy && suggestion.confidenceBreakdown && (
            <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-600">
              {confidenceLabel(suggestion.confidence)}. {explainConfidence(suggestion.confidenceBreakdown)}
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 border-t border-base-700 pt-4">
          {profile === undefined && <p className="text-xs text-neutral-600">Looking at your controls…</p>}

          {profile === null && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-600">
                Noma doesn't have a control to put this on yet — accepting just remembers this is useful.
              </p>
              <button
                type="button"
                onClick={() => void handleAcceptInformational()}
                className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Accept
              </button>
            </div>
          )}

          {profile && (
            <>
              <p className="mb-2 text-xs text-neutral-600">
                Which control should this replace? You choose — Noma never picks for you.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => {
                  const control = profile.controls.find((item) => item.slot === slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => void handleAssign(slot)}
                      className="rounded-md border border-base-700 px-2 py-2 text-center text-xs text-neutral-600 transition-colors hover:border-accent hover:text-neutral-100"
                    >
                      <div className="text-[10px] text-neutral-500">{slot}</div>
                      <div className="mt-0.5 truncate text-neutral-100">{control?.label ?? '—'}</div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsPicking(false)}
            className="mt-3 text-xs text-neutral-500 hover:text-neutral-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
