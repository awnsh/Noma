import { useEffect, useState } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { useUiStore } from '../stores/uiStore'
import { ControlTile } from '../components/ControlTile'
import { NomaMoment } from '../components/NomaMoment'
import { EmptyState } from '../components/EmptyState'
import { StatusIndicator } from '../components/StatusIndicator'
import { CreateProfileModal } from '../components/CreateProfileModal'
import { HomeSidePanel } from '../components/HomeSidePanel'
import { AppIcon } from '../components/AppIcon'
import { LearnedActionCard } from '../components/LearnedActionCard'
import { useLearnedActions } from '../lib/useLearnedActions'

/** How many learned actions Home previews before pointing to the full list
 *  on Controls — a taste, not the whole catalog; keeps this section from
 *  competing with Noma Notice/Your Noma for the page's attention. */
const HOME_LEARNED_ACTIONS_PREVIEW_COUNT = 2

/**
 * Home — the most important screen in the app. A workspace, not a
 * dashboard: a greeting, the one most important thing Noma noticed (the
 * Noma Moment), and the interface Noma has built for whatever you're
 * working in right now. Everything else lives one click away.
 */

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good evening.'
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

export function Home() {
  const { context, isLoading, refresh, subscribeToContext } = useFlowStore()
  const { enabled: monitoringEnabled, refresh: refreshWorkflow } = useWorkflowStore()
  const { suggestions, isLoading: suggestionsLoading, refresh: refreshSuggestions, subscribe, resolve } =
    useSuggestionsStore()
  const setActivePage = useUiStore((state) => state.setActivePage)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  useEffect(() => {
    refresh()
    refreshWorkflow()
    refreshSuggestions()
    const unsubscribeContext = subscribeToContext()
    const unsubscribeSuggestions = subscribe()
    return () => {
      unsubscribeContext()
      unsubscribeSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { application, profile } = context
  const controls = profile?.controls ?? []
  // The single most important thing to show — most recent first, since
  // that's the workflow Noma most recently confirmed is real.
  const topSuggestion = suggestions[0]
  const learnedActions = useLearnedActions()
  const learnedActionsPreview = learnedActions?.slice(0, HOME_LEARNED_ACTIONS_PREVIEW_COUNT) ?? []

  return (
    <div className="mx-auto flex max-w-5xl items-start gap-10 px-12 py-16">
      <div className="min-w-0 flex-1 max-w-2xl">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              {greeting().replace('.', '')}
            </p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight text-neutral-100">
              {monitoringEnabled ? 'Noma is learning your workflow.' : "Noma isn't learning yet."}
            </h1>
            <p className="mt-2.5 max-w-md text-sm text-neutral-600">
              The more you use your computer, the more useful your Noma becomes.
            </p>
          </div>
          {/* Understated on purpose — a status signal, not a second
              headline competing with the one above it. */}
          <div className="shrink-0 pt-1.5">
            <StatusIndicator active={monitoringEnabled} label={monitoringEnabled ? 'Learning' : 'Off'} />
          </div>
        </div>

        <section className="mb-12">
          {!monitoringEnabled ? (
            <EmptyState
              title="Noma isn't learning yet."
              hint="Turn on monitoring in Settings and Noma will start noticing the workflows you repeat."
            />
          ) : suggestionsLoading ? null : topSuggestion ? (
            <NomaMoment
              suggestion={topSuggestion}
              variant="hero"
              onReject={(id) => resolve(id, 'rejected')}
              onDismiss={(id) => resolve(id, 'dismissed')}
            />
          ) : (
            <EmptyState
              title="Keep working normally."
              hint="Noma will surface a pattern here as soon as it notices you repeating something."
            />
          )}
        </section>

        <div className="mb-12 h-px bg-base-700" />

        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-neutral-100">Your Noma</h2>
            {application && !profile && (
              <button
                type="button"
                onClick={() => setIsCreatingProfile(true)}
                className="shrink-0 text-xs font-medium text-accent hover:opacity-80"
              >
                Create profile
              </button>
            )}
          </div>
          <p className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-neutral-600">
            {isLoading ? (
              'Detecting the active application…'
            ) : application ? (
              <>
                <span>Adapts to how you work, right now, for</span>
                <AppIcon applicationId={application.id} name={application.name} size={16} />
                <span className="font-medium text-neutral-100">{application.name}.</span>
              </>
            ) : (
              'Adapts to how you work. Open an application Noma knows to see it in action.'
            )}
          </p>

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

          {profile ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((slot) => {
                  const control = controls.find((item) => item.slot === slot)
                  return <ControlTile key={slot} slot={slot} control={control} application={application} />
                })}
              </div>
              <button
                type="button"
                onClick={() => setActivePage('controls')}
                className="mt-4 text-xs text-neutral-500 hover:text-neutral-100"
              >
                See all controls →
              </button>
            </>
          ) : (
            <EmptyState
              title="Noma will build your interface as it learns."
              hint="Keep working normally. Controls appear here once Noma has something to put on them."
            />
          )}
        </section>

        {learnedActionsPreview.length > 0 && (
          <>
            <div className="my-12 h-px bg-base-700" />
            <section>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-neutral-100">Learned actions</h2>
                {(learnedActions?.length ?? 0) > HOME_LEARNED_ACTIONS_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setActivePage('controls')}
                    className="shrink-0 text-xs text-neutral-500 hover:text-neutral-100"
                  >
                    View all →
                  </button>
                )}
              </div>
              <p className="mb-5 text-sm text-neutral-600">
                Every action Noma created from a workflow it noticed you repeat.
              </p>
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
          </>
        )}
      </div>

      <HomeSidePanel profile={profile} application={application} />
    </div>
  )
}
