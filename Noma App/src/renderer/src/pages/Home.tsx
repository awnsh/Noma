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
import { AppLogo } from '../components/AppLogo'

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

  return (
    <div className="mx-auto max-w-2xl px-12 py-16">
      <div className="mb-16">
        <h1 className="font-display text-4xl font-semibold text-neutral-100">{greeting()}</h1>
        <p className="mt-2.5 text-base text-neutral-600">
          {monitoringEnabled ? 'Noma is learning your workflow.' : "Noma isn't learning yet."}
        </p>
        {/* Deliberately last and smallest in this block — a status signal,
            not a second headline competing with the greeting above it. */}
        <div className="mt-4">
          <StatusIndicator active={monitoringEnabled} label={monitoringEnabled ? 'Learning' : 'Off'} />
        </div>
      </div>

      <section className="mb-16">
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
        <p className="mb-5 flex items-center gap-1.5 text-sm text-neutral-600">
          {isLoading ? (
            'Detecting the active application…'
          ) : application ? (
            <>
              Adapts to how you work — right now, for
              <AppLogo applicationId={application.id} name={application.name} className="h-4 w-4" />
              <span className="text-neutral-100">{application.name}</span>.
            </>
          ) : (
            'Adapts to how you work — open an application Noma knows to see it in action.'
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
                return <ControlTile key={slot} slot={slot} control={control} />
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
            hint="Keep working normally — controls appear here once Noma has something to put on them."
          />
        )}
      </section>
    </div>
  )
}
