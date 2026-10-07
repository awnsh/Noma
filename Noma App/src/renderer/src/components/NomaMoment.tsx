import { useState } from 'react'
import type { ApplicationProfile, Suggestion, WorkflowPreview } from '@shared/types'
import { GLIDE_ZONE_LABELS, glideZoneForSlot } from '@shared/constants'
import { useGlideStore } from '../stores/glideStore'
import { useUiStore } from '../stores/uiStore'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { explainConfidence } from '../lib/explainConfidence'
import { confidenceLabel } from '../lib/confidenceLabel'
import { workflowChainSteps } from '../lib/workflowChain'
import { formatAbsoluteTime, formatRelativeTime } from '../lib/formatRelativeTime'
import { WorkflowChain } from './WorkflowChain'
import { AppIcon } from './AppIcon'
import { HERO_CARD } from '../lib/surfaces'

/**
 * The Noma Moment: the single most important component in the app. "Noma
 * noticed something you do repeatedly." One reusable component for every
 * learned-workflow suggestion, wherever it needs to appear (Home's hero
 * slot, the Controls page's suggestion list, Demo Mode).
 *
 * `variant="hero"` gets the app's one hero-tier surface (`HERO_CARD`, see
 * `lib/surfaces.ts`): a restrained, mostly-solid card, deliberately with
 * no colored glow (an earlier version had a blue/violet ambient wash here;
 * real feedback was that it read as "glowing because it's AI," not a
 * physical product). What makes this card outrank the ones around it is
 * the real workflow inside it (`WorkflowChain`'s large application-icon
 * nodes), not its own background. `compact` stays undecorated (it already
 * sits inside a list container of its own, e.g. `SuggestionsPanel`'s
 * divided rows). No card, no glow, no icon marking it as "AI." Either way
 * the emphasis comes from typography
 * and spacing, and the workflow sequence itself is the one visually
 * interesting element (see `WorkflowChain`). The primary row is a
 * confident, two-choice moment
 * (Create action / Not now); the feedback/explain affordances a person
 * only wants occasionally ("Why?", "Not useful") sit behind a single quiet
 * "More" toggle rather than crowding the main decision (see product
 * brief section 6, "remove prototype-like copy").
 *
 * `variant="hero"` is the large Home-page presentation; `variant="compact"`
 * is the same component sized down for a list context. Internal state
 * machine: idle -> picking (choosing which control slot) -> success
 * (confirms what was actually created). `picking`'s slot choice is a real
 * `assignSuggestionToControl` call, and `success` only renders once that
 * call actually returns a control.
 */
interface NomaMomentProps {
  suggestion: Suggestion
  variant?: 'hero' | 'compact'
  onReject: (id: string) => void
  onDismiss: (id: string) => void
  /** Fires once an action was actually created (or, for an informational
   *  suggestion, actually acknowledged). After the real IPC call
   *  succeeds, never speculatively. Optional; Demo Mode uses it to advance
   *  its own scripted narrative once the real assignment lands. */
  onCreated?: (label: string) => void
}

function occurrenceSentence(suggestion: Suggestion): string {
  const count = suggestion.confidenceBreakdown?.occurrenceCount
  if (count === undefined) return suggestion.explanation
  const where = suggestion.applicationName ? ` in ${suggestion.applicationName}` : ''
  if (suggestion.isDemo) return `Demo Mode acted out this workflow ${count} time${count === 1 ? '' : 's'}${where}.`
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
  const [preview, setPreview] = useState<WorkflowPreview | null | undefined>(undefined)
  const [savedSlot, setSavedSlot] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const glide = useGlideStore((state) => state.state)
  const setGlideEnabled = useGlideStore((state) => state.setEnabled)
  const setActivePage = useUiStore((state) => state.setActivePage)
  const zoneCount = glide?.zoneCount ?? 4
  const assignToControl = useSuggestionsStore((state) => state.assignToControl)
  const resolve = useSuggestionsStore((state) => state.resolve)
  const dismissSaved = useSuggestionsStore((state) => state.dismissSaved)

  const isHero = variant === 'hero'
  const chain = workflowChainSteps(suggestion)

  const startPicking = async (): Promise<void> => {
    setIsPicking(true)
    setSaveError(null)
    if (suggestion.action) void window.flow.previewSuggestionAction(suggestion.id).then(setPreview)
    if (!suggestion.applicationId) {
      setProfile(null)
      return
    }
    const result = await window.flow.getProfileForApplication(suggestion.applicationId)
    if (result || !suggestion.action) {
      setProfile(result)
      return
    }
    // An actionable workflow learned in an app that has no controls yet
    // (anything but the few apps Noma ships profiles for). The user just
    // asked to turn it into an action, so set the app up with the same 4
    // empty slots the Profiles page creates, rather than only bookmarking it.
    const summaries = await window.flow.listApplicationProfileSummaries()
    const application = summaries.find((entry) => entry.application.id === suggestion.applicationId)?.application
    setProfile(application ? await window.flow.createProfileForApplication(application, application.name) : null)
  }

  const handleAssign = async (slot: number): Promise<void> => {
    setSaveError(null)
    const ok = await assignToControl(suggestion.id, slot)
    if (!ok) {
      setSaveError('Noma couldn’t save this. The suggestion may have changed; close this and try again.')
      return
    }
    // The control's new label, read back from what was actually saved.
    const saved = suggestion.applicationId ? await window.flow.getProfileForApplication(suggestion.applicationId) : null
    const label = saved?.controls.find((control) => control.slot === slot)?.label ?? 'Saved'
    setSavedSlot(slot)
    setCreatedLabel(label)
    onCreated?.(label)
  }

  const handleAcceptInformational = async (): Promise<void> => {
    await window.flow.resolveSuggestion(suggestion.id, 'accepted')
    setCreatedLabel('Noted')
    onCreated?.('Noted')
  }

  // Success: something real was actually saved (or, for an
  // informational-only suggestion, acknowledged), never shown speculatively.
  if (createdLabel) {
    const zone = savedSlot !== null ? glideZoneForSlot(savedSlot, zoneCount) : null
    const zoneName = zone ? GLIDE_ZONE_LABELS[zoneCount][zone] : null
    const appName = suggestion.applicationName ?? 'that app'
    return (
      <div className={isHero ? `${HERO_CARD} p-8` : ''} style={{ animation: 'noma-settle 350ms ease-out' }}>
        <p className="text-xs text-neutral-500">{createdLabel === 'Noted' ? 'Accepted' : 'Saved'}</p>
        <p className={`mt-1.5 font-display font-semibold text-neutral-100 ${isHero ? 'text-2xl' : 'text-lg'}`}>
          {createdLabel === 'Noted' ? 'Noted' : createdLabel}
        </p>
        <p className="mt-1.5 max-w-md text-sm text-neutral-400">
          {createdLabel === 'Noted'
            ? "Noma will keep this in mind when deciding what to suggest next."
            : zoneName
              ? `Now on the ${zoneName.toLowerCase()} Glide zone in ${appName}. To run it, switch to ${appName} and swipe in from the ${zoneName.toLowerCase()}.`
              : `Saved to control ${savedSlot} in ${appName}. Switch Glide to four zones to reach it with a swipe.`}
        </p>
        {createdLabel !== 'Noted' && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            {glide && glide.platformSupported && !glide.enabled && (
              <button
                type="button"
                onClick={() => void setGlideEnabled(true)}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
              >
                Turn on Glide
              </button>
            )}
            <button type="button" onClick={() => setActivePage('holo')} className="text-xs text-accent hover:opacity-80">
              See it on the Glide page
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => dismissSaved(suggestion.id)}
          className="mt-4 text-xs text-neutral-500 hover:text-neutral-100"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className={isHero ? `${HERO_CARD} p-6` : ''}>
      <div className="flex items-start justify-between gap-4">
        <p
          className={
            isHero
              ? 'text-[11px] font-semibold uppercase tracking-widest text-neutral-500'
              : 'font-display text-base font-semibold text-neutral-100'
          }
        >
          <span className={isHero ? 'text-violet' : ''}>{suggestion.isDemo ? 'Demo workflow' : 'Noma noticed'}</span>
          {suggestion.isDemo && (
            <span className="ml-2 rounded border border-base-600 px-1.5 py-px text-[10px] font-normal normal-case tracking-normal text-neutral-500">
              Simulated by Demo Mode, not learned from you
            </span>
          )}
        </p>
        {isHero && (
          <span className="shrink-0 text-xs text-neutral-500" title={formatAbsoluteTime(suggestion.createdAt)}>
            {formatRelativeTime(suggestion.createdAt)}
          </span>
        )}
      </div>

      <div
        className={`flex items-start gap-2.5 text-neutral-100 ${
          isHero ? 'mt-2' : 'mt-1'
        }`}
      >
        {isHero && (!chain || chain.length <= 1) && suggestion.applicationId && (
          <AppIcon applicationId={suggestion.applicationId} name={suggestion.applicationName ?? ''} size={28} variant="tile" className="mt-0.5" />
        )}
        <p className={isHero ? 'font-display text-xl font-semibold leading-snug' : 'text-sm text-neutral-600'}>
          {occurrenceSentence(suggestion)}
        </p>
      </div>

      {chain && chain.length > 1 && (
        <div className={isHero ? 'mt-6' : 'mt-3'}>
          <WorkflowChain steps={chain} size={isHero ? 'lg' : 'md'} centered />
        </div>
      )}

      {!isPicking ? (
        <>
          <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${isHero ? 'mt-6' : 'mt-3'}`}>
            <p className={`text-neutral-100 ${isHero ? 'text-base' : 'text-sm'}`}>
              {suggestion.action ? 'Turn this into one Glide action?' : 'Worth remembering for next time?'}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => void startPicking()}
                className={`rounded-md bg-accent font-medium text-white shadow-[0_2px_8px_-2px_rgba(76,126,255,0.35)] transition-colors duration-150 hover:bg-accent/90 active:opacity-90 ${
                  isHero ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
                }`}
              >
                {suggestion.action ? 'Review steps' : 'Sounds right'}
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
                className="text-[11px] text-neutral-400 hover:text-neutral-600"
              >
                More
              </button>
            </div>
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
                Noma doesn't have a control to put this on yet. Accepting just remembers this is useful.
              </p>
              <button
                type="button"
                onClick={() => void handleAcceptInformational()}
                className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-[0_2px_8px_-2px_rgba(76,126,255,0.35)] transition-colors duration-150 hover:bg-accent/90"
              >
                Accept
              </button>
            </div>
          )}

          {suggestion.action && (
            <div className="mb-4">
              <p className="mb-2 text-xs text-neutral-500">Exactly what this will do, in order:</p>
              {preview === undefined ? (
                <p className="text-xs text-neutral-600">Working it out…</p>
              ) : preview === null ? (
                <p className="text-xs text-neutral-600">This suggestion has no steps to run.</p>
              ) : (
                <>
                  <ol className="space-y-1 text-sm">
                    {preview.steps.map((step, index) => (
                      <li key={index} className="flex gap-2.5">
                        <span className="w-4 shrink-0 text-right font-mono text-[11px] leading-5 text-neutral-600">{index + 1}</span>
                        <span className="min-w-0">
                          <span className={step.kind === 'wait' ? 'text-neutral-500' : 'text-neutral-100'}>
                            {step.description}
                          </span>
                          {step.added && <span className="ml-1.5 text-[11px] text-neutral-500">(added by Noma)</span>}
                          {step.warning && <span className="block text-xs text-error">{step.warning}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 text-xs text-neutral-600">
                    {preview.replayable
                      ? 'It only runs when you swipe its zone (or press its control), and stops at the first step that fails.'
                      : 'Some steps may not replay reliably. You can still save it; it stops at the first step that fails and tells you which.'}
                  </p>
                </>
              )}
            </div>
          )}

          {profile && (
            <>
              <p className="mb-2 text-xs text-neutral-500">
                Which Glide zone in {suggestion.applicationName ?? 'this app'} should run it? It replaces what&apos;s there now.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => {
                  const control = profile.controls.find((item) => item.slot === slot)
                  const zone = glideZoneForSlot(slot, zoneCount)
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => void handleAssign(slot)}
                      className="rounded-md border border-base-700 px-2 py-2 text-center text-xs text-neutral-500 transition-colors hover:border-violet hover:text-neutral-100"
                    >
                      <div className="text-[10px] text-neutral-500">{zone ? GLIDE_ZONE_LABELS[zoneCount][zone] : `Control ${slot}`}</div>
                      <div className="mt-0.5 truncate text-neutral-100">{control?.label || '–'}</div>
                    </button>
                  )
                })}
              </div>
              {zoneCount === 2 && (
                <p className="mt-2 text-[11px] text-neutral-600">Glide is in two-zone mode, so controls 3 and 4 have no swipe.</p>
              )}
              {saveError && <p className="mt-2 text-xs text-error">{saveError}</p>}
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
