import { useEffect } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { StatusCard } from '../components/StatusCard'
import { ControlTile } from '../components/ControlTile'
import { WorkflowMonitoringPanel } from '../components/WorkflowMonitoringPanel'
import { SuggestionsPanel } from '../components/SuggestionsPanel'

export function Dashboard() {
  const { context, flowStatus, isLoading, refresh, subscribeToContext } = useFlowStore()

  useEffect(() => {
    refresh()
    const unsubscribe = subscribeToContext()
    return unsubscribe
  }, [refresh, subscribeToContext])

  const { application, profile } = context
  const controls = profile?.controls ?? []

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <section className="mb-10">
        <div className="text-xs uppercase tracking-widest text-neutral-500">
          Current Application
        </div>
        <div className="mt-2 text-2xl font-semibold text-neutral-100">
          {isLoading ? 'Detecting…' : (application?.name ?? 'No application detected yet')}
        </div>
        <div className="mt-1 text-sm text-neutral-500">
          {profile
            ? `Active profile: ${profile.name}`
            : application
              ? `No profile configured for ${application.name} yet.`
              : 'Waiting for Windows to report the foreground application.'}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
          Current Controls
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((slot) => {
            const control = controls.find((item) => item.slot === slot)
            return <ControlTile key={slot} slot={slot} label={control?.label ?? null} />
          })}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">Flow Status</div>
        <div className="grid grid-cols-3 gap-4">
          <StatusCard label="Actions observed today" value={flowStatus.actionsObservedToday} />
          <StatusCard label="Patterns detected" value={flowStatus.patternsDetected} />
          <StatusCard label="Suggestions" value={flowStatus.suggestionsCount} />
        </div>
      </section>

      <SuggestionsPanel />

      <WorkflowMonitoringPanel />
    </div>
  )
}
