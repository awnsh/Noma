import { WorkflowMonitoringPanel } from '../components/WorkflowMonitoringPanel'
import { DataManagementPanel } from '../components/DataManagementPanel'

const COLLECTED = [
  'Which application is active',
  'Shortcuts that hold Control, Alt, or the Windows key',
  'Which of your controls you use',
  'Timestamps, to notice repetition',
  'Patterns Flow finds in the above'
]

const NEVER_COLLECTED = [
  'Passwords',
  'Message or document contents',
  'Screenshots',
  'Clipboard contents',
  'Raw typed text'
]

export function Settings() {
  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-100">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Flow learning, and your data.</p>
      </div>

      <section className="mb-8 rounded-xl border border-white/10 bg-base-900 px-5 py-4">
        <div className="text-xs uppercase tracking-widest text-neutral-500">Flow Learning</div>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          Flow learns from interaction metadata to identify repetitive workflows — never from what
          you actually type or see.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-neutral-600">
              Flow sees
            </div>
            <ul className="space-y-1 text-xs text-neutral-400">
              {COLLECTED.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-neutral-600">
              Flow never sees
            </div>
            <ul className="space-y-1 text-xs text-neutral-500">
              {NEVER_COLLECTED.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-neutral-600">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="mb-8">
        <WorkflowMonitoringPanel />
      </div>

      <DataManagementPanel />
    </div>
  )
}
