import { useEffect, useState } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { useUiStore } from '../stores/uiStore'
import { NomaMoment } from '../components/NomaMoment'
import { EmptyState } from '../components/EmptyState'
import { CreateProfileModal } from '../components/CreateProfileModal'
import { HomeSidePanel } from '../components/HomeSidePanel'
import { GlideZoneMap } from '../components/GlideZoneMap'
import { BUTTON_PRIMARY } from '../lib/surfaces'
import { LearnedActionCard } from '../components/LearnedActionCard'
import { useLearnedActions } from '../lib/useLearnedActions'
import { GettingStartedCard } from '../components/GettingStartedCard'
import { useGlideStore } from '../stores/glideStore'
import { useActionRunStore } from '../stores/actionRunStore'
import { glideActivityMessage, glideStatusLine } from '../lib/glideMessages'
import { useStoreSync } from '../lib/useStoreSync'

/** How many learned actions Home previews before pointing to the full list
 *  on Controls (a taste, not the whole catalog); keeps this section from
 *  competing with Noma Notice/Your Noma for the page's attention. */
const HOME_LEARNED_ACTIONS_PREVIEW_COUNT = 2

/**
 * Home: the most important screen in the app. A workspace, not a
 * dashboard (a greeting, the one most important thing Noma noticed, the
 * Noma Moment, and the interface Noma has built for whatever you're
 * working in right now). Everything else lives one click away.
 */

export function Home() {
  const { context, isLoading, refresh, subscribeToContext } = useFlowStore()
  const { enabled: monitoringEnabled, refresh: refreshWorkflow } = useWorkflowStore()
  const { suggestions, refresh: refreshSuggestions, subscribe, resolve } =
    useSuggestionsStore()
  const setActivePage = useUiStore((state) => state.setActivePage)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const learnedActions = useLearnedActions()
  const { state: glide, lastActivity, refresh: refreshGlide } = useGlideStore()
  const lastResult = useActionRunStore((state) => state.lastResult)

  useStoreSync(
    { refresh, subscribe: subscribeToContext },
    { refresh: refreshWorkflow },
    { refresh: refreshSuggestions, subscribe },
    { refresh: refreshGlide }
  )

  const { application, profile } = context
  const controls = profile?.controls ?? []
  // The single most important thing to show: most recent first, since
  // that's the workflow Noma most recently confirmed is real.
  const topSuggestion = suggestions[0]
  const learnedActionsPreview = learnedActions?.slice(0, HOME_LEARNED_ACTIONS_PREVIEW_COUNT) ?? []

  const developerTools = useUiStore((state) => state.developerTools)
  const zoneCount = glide?.zoneCount ?? 4
  const problem = glideStatusLine(glide).tone === 'problem' ? glideStatusLine(glide).text : null
  const status = glide?.enabled ? 'Glide is ready' : monitoringEnabled ? 'Glide is off. Flow is learning.' : 'Glide is off'

  return (
    <div className="mx-auto max-w-[760px] px-12 pb-24 pt-14">
      <header className="mb-9">
        <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-neutral-50">
          {isLoading ? 'Noma' : application ? application.name : 'Noma'}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${glide?.enabled ? 'bg-success' : 'bg-neutral-600'}`} />
            {status}
          </span>
          {!application && !isLoading && (
            <>
              <span aria-hidden className="text-neutral-600">·</span>
              <span>Switch to an app to see its four actions</span>
            </>
          )}
        </p>
        {problem && <p className="mt-2 max-w-md text-sm text-error">{problem}</p>}
        {lastActivity && glide?.enabled && glide.zoneCount && (
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-neutral-500">
            Last swipe: {glideActivityMessage(lastActivity, glide.zoneCount)}
            {lastResult && !lastResult.ok && lastResult.at >= lastActivity.at && lastActivity.type === 'fire' && lastActivity.outcome === 'pressed'
              ? ` It didn't finish: ${lastResult.reason ?? 'unknown reason'}.`
              : ''}
          </p>
        )}
      </header>

      <GettingStartedCard flowEnabled={monitoringEnabled} savedWorkflows={learnedActions?.length ?? 0} />

      <section aria-label="Glide zones" className="mb-14">
        {isCreatingProfile && application && (
          <CreateProfileModal
            application={application}
            onClose={() => setIsCreatingProfile(false)}
            onCreated={() => {
              setIsCreatingProfile(false)
              refresh()
            }}
          />
        )}

        {profile && application ? (
          <>
            <GlideZoneMap
              zoneCount={zoneCount}
              controls={controls}
              centerLabel={application.name}
              centerAppId={application.id}
              onEditZone={() => setActivePage('holo')}
            />
            <div className="mx-auto mt-4 flex max-w-[600px] items-center justify-between text-[13px] text-neutral-500">
              <span>Slide a finger in from the palm rest. The side and half you land in picks the action.</span>
              <button type="button" onClick={() => setActivePage('holo')} className="shrink-0 text-neutral-300 underline decoration-white/20 underline-offset-[3px] hover:text-neutral-50">
                Change zones
              </button>
            </div>
          </>
        ) : application ? (
          <>
            <GlideZoneMap zoneCount={zoneCount} controls={[]} centerLabel={application.name} centerAppId={application.id} />
            <div className="mx-auto mt-4 flex max-w-[600px] items-center justify-between gap-6 text-[13px] text-neutral-400">
              <span>{application.name} has no Glide actions yet. Give it four, then swipe in to run them.</span>
              <button type="button" onClick={() => setIsCreatingProfile(true)} className={`shrink-0 ${BUTTON_PRIMARY}`}>
                Set up {application.name}
              </button>
            </div>
          </>
        ) : isLoading ? null : (
          <EmptyState hint="Open an app, and its four Glide actions appear here." />
        )}
      </section>

      {/* No pattern yet means nothing to show: the section only appears
          when Flow is off (with how to turn it on) or Noma has a suggestion. */}
      {(!monitoringEnabled || topSuggestion) && (
        <section className="mb-14">
          {!monitoringEnabled ? (
            <EmptyState
              title="Flow is off."
              hint="Turn on Flow (Workflows page) and Noma starts noticing the shortcut sequences you repeat, so you can save them to a Glide zone."
            />
          ) : (
            topSuggestion && (
              <NomaMoment
                suggestion={topSuggestion}
                variant="hero"
                onReject={(id) => resolve(id, 'rejected')}
                onDismiss={(id) => resolve(id, 'dismissed')}
              />
            )
          )}
        </section>
      )}

      {learnedActionsPreview.length > 0 && (
        <section className="mb-14">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-neutral-100">Saved workflows</h2>
            {(learnedActions?.length ?? 0) > HOME_LEARNED_ACTIONS_PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setActivePage('workflows')}
                className="shrink-0 text-[13px] text-neutral-400 hover:text-neutral-100"
              >
                All workflows
              </button>
            )}
          </div>
          <div>
            {learnedActionsPreview.map(({ macro, chain, usageCount, applicationId, applicationName }) => (
              <LearnedActionCard
                key={macro.id}
                name={macro.name}
                chain={chain}
                usageCount={usageCount}
                applicationId={applicationId}
                applicationName={applicationName}
              />
            ))}
          </div>
        </section>
      )}

      {developerTools && (
        <div className="mt-6 border-t border-white/[0.06] pt-8">
          <HomeSidePanel profile={profile} application={application} />
        </div>
      )}
    </div>
  )
}
