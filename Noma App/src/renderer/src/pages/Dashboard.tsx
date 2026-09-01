import { useEffect, useState } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { ControlTile } from '../components/ControlTile'
import { SuggestionsPanel } from '../components/SuggestionsPanel'
import { CreateProfileModal } from '../components/CreateProfileModal'
import { HardwareStatusPill } from '../components/HardwareStatusPill'
import { GLASS_CARD } from '../lib/surfaces'
import { useUiStore } from '../stores/uiStore'

/** A single plain-language read of what Flow is doing right now — this
 *  phase's section 2: the home screen answers "what is Noma doing right
 *  now?", not a wall of raw counters. The counters themselves still live
 *  on the Learning Center, for anyone who wants them. */
function describeFlowStatus(
  monitoringEnabled: boolean,
  suggestionsCount: number,
  patternsDetected: number
): string {
  if (!monitoringEnabled) return "Flow isn't learning yet."
  if (suggestionsCount > 0) return 'Flow noticed something — see below.'
  if (patternsDetected > 0) return 'Flow is noticing patterns.'
  return 'Flow is learning your workflow.'
}

export function Dashboard() {
  const { context, flowStatus, isLoading, refresh, subscribeToContext } = useFlowStore()
  const { enabled: monitoringEnabled, refresh: refreshWorkflow } = useWorkflowStore()
  const setActivePage = useUiStore((state) => state.setActivePage)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  useEffect(() => {
    refresh()
    refreshWorkflow()
    const unsubscribe = subscribeToContext()
    return unsubscribe
  }, [refresh, refreshWorkflow, subscribeToContext])

  const { application, profile } = context
  const controls = profile?.controls ?? []

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <section className="mb-10">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-neutral-500">
            Current Application
          </div>
          <HardwareStatusPill />
        </div>
        <div className="mt-2 font-display text-2xl font-semibold text-neutral-100">
          {isLoading ? 'Detecting…' : (application?.name ?? 'No application detected yet')}
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500">
          <span>
            {profile
              ? `Active profile: ${profile.name}`
              : application
                ? `No profile configured for ${application.name} yet.`
                : // A first-time user's very first real screen — "waiting for
                  // Windows" told them nothing was wrong, but not what to do.
                  // Naming the apps that already have a starter profile
                  // (database/seed.ts) turns this into a next step, not a
                  // dead end. Update this list if seed.ts's shipped
                  // profiles ever change.
                  'Open Visual Studio Code, Chrome, or Spotify to see Noma adapt — those already have starter profiles built in.'}
          </span>
          {application && !profile && (
            <button
              type="button"
              onClick={() => setIsCreatingProfile(true)}
              className="shrink-0 rounded-full border border-accent-muted bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97]"
            >
              Create profile
            </button>
          )}
        </div>
      </section>

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

      <section className="mb-10">
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
          Current Controls
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((slot) => {
            const control = controls.find((item) => item.slot === slot)
            return <ControlTile key={slot} slot={slot} control={control} />
          })}
        </div>
      </section>

      <section className={`mb-10 flex items-center justify-between px-5 py-4 ${GLASS_CARD}`}>
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500">Flow Status</div>
          <div className="mt-1.5 text-sm text-neutral-300">
            {describeFlowStatus(monitoringEnabled, flowStatus.suggestionsCount, flowStatus.patternsDetected)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActivePage('settings')}
          className="shrink-0 text-xs text-neutral-500 hover:text-neutral-300"
        >
          {monitoringEnabled ? 'Settings' : 'Turn on in Settings →'}
        </button>
      </section>

      <SuggestionsPanel />
    </div>
  )
}
