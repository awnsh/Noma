import { useEffect, useState } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { useUiStore } from '../stores/uiStore'
import { ControlTile } from '../components/ControlTile'
import { NomaMoment } from '../components/NomaMoment'
import { EmptyState } from '../components/EmptyState'
import { CreateProfileModal } from '../components/CreateProfileModal'
import { HomeSidePanel } from '../components/HomeSidePanel'
import { AppIcon } from '../components/AppIcon'
import { LearnedActionCard } from '../components/LearnedActionCard'
import { useLearnedActions } from '../lib/useLearnedActions'
import { GettingStartedCard } from '../components/GettingStartedCard'
import { useGlideStore } from '../stores/glideStore'
import { useActionRunStore } from '../stores/actionRunStore'
import { glideActivityMessage, glideStatusLine } from '../lib/glideMessages'
import { CONTROL_SLOTS } from '@shared/constants'
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

  return (
    <div className="mx-auto flex max-w-5xl items-start gap-10 px-12 py-16">
      <div className="min-w-0 flex-1 max-w-2xl">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              {greeting().replace('.', '')}
            </p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight text-neutral-100">
              {glide?.enabled ? 'Glide is ready.' : monitoringEnabled ? 'Noma is learning your workflow.' : 'Noma'}
            </h1>
            {glideStatusLine(glide).tone === 'problem' && (
              <p className="mt-2.5 max-w-md text-sm text-error">{glideStatusLine(glide).text}</p>
            )}
            {lastActivity && glide?.enabled && glide.zoneCount && (
              <p className="mt-3 max-w-md text-xs leading-relaxed text-neutral-500">
                Last swipe: {glideActivityMessage(lastActivity, glide.zoneCount)}
                {lastResult && !lastResult.ok && lastResult.at >= lastActivity.at && lastActivity.type === 'fire' && lastActivity.outcome === 'pressed'
                  ? ` It didn't finish: ${lastResult.reason ?? 'unknown reason'}.`
                  : ''}
              </p>
            )}
          </div>
        </div>

        <GettingStartedCard flowEnabled={monitoringEnabled} savedWorkflows={learnedActions?.length ?? 0} />

        {/* No pattern yet means nothing to show: the section only appears
            when Flow is off (with how to turn it on) or Noma has a suggestion. */}
        {(!monitoringEnabled || topSuggestion) && (
          <>
            <section className="mb-12">
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

            <div className="mb-12 h-px bg-base-700" />
          </>
        )}

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
                <AppIcon applicationId={application.id} name={application.name} size={20} />
                <span className="font-medium text-neutral-100">{application.name}</span>
              </>
            ) : (
              'Open an application Noma knows to see its controls.'
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
              <div className="grid grid-cols-4 gap-3 mc-stagger">
                {CONTROL_SLOTS.map((slot) => {
                  const control = controls.find((item) => item.slot === slot)
                  return <ControlTile key={slot} slot={slot} control={control} application={application} />
                })}
              </div>
              <button
                type="button"
                onClick={() => setActivePage('holo')}
                className="mt-4 text-xs text-neutral-500 hover:text-neutral-100"
              >
                Change what each zone does →
              </button>
            </>
          ) : application ? (
            <EmptyState hint="Controls appear once Noma has something to put on them." />
          ) : null}
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
                    onClick={() => setActivePage('workflows')}
                    className="shrink-0 text-xs text-neutral-500 hover:text-neutral-100"
                  >
                    View all →
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
          </>
        )}
      </div>

      <HomeSidePanel profile={profile} application={application} />
    </div>
  )
}
