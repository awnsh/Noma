import { useEffect } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import { ToggleSwitch } from './ToggleSwitch'

export function WorkflowMonitoringPanel() {
  const { enabled, patterns, refresh, setEnabled } = useWorkflowStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <section className="mb-10 rounded-xl border border-white/10 bg-base-900 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500">
            Workflow Monitoring
          </div>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            When enabled, Flow watches for keyboard shortcuts that hold down Control, Alt, or the
            Windows key — never single keys, never what you type. Nothing leaves this device. See{' '}
            <span className="text-neutral-300">docs/privacy-and-legal.md</span> for the full policy.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-neutral-500">{enabled ? 'Enabled' : 'Disabled'}</span>
          <ToggleSwitch checked={enabled} onChange={setEnabled} label="Workflow monitoring" />
        </div>
      </div>

      {enabled && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-neutral-500">
            Patterns detected today
          </div>
          {patterns.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Nothing yet — patterns need repeated use (the same shortcut a handful of times) before
              Flow surfaces them here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {patterns.map((pattern) => (
                <li key={pattern.id} className="text-sm text-neutral-300">
                  {pattern.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
