import { useEffect } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import { ToggleSwitch } from './ToggleSwitch'
import { COMMAND_MODIFIERS_COPY } from '../lib/platform'

export function WorkflowMonitoringPanel() {
  const { enabled, clickCaptureEnabled, patterns, refresh, setEnabled, setClickCaptureEnabled } = useWorkflowStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <section className="mb-10 rounded-xl border border-white/10 bg-base-900 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-[15px] font-semibold text-neutral-100">
            Flow learning
          </div>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            When on, Flow notes which app is in front and the shortcuts you press that hold down{' '}
            {COMMAND_MODIFIERS_COPY}: never single keys, never what you type. Nothing leaves this computer.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-neutral-500">{enabled ? 'On' : 'Off'}</span>
          <ToggleSwitch checked={enabled} onChange={setEnabled} label="Flow learning" />
        </div>
      </div>

      {enabled && (
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-white/5 pt-4">
          <div>
            <div className="font-display text-[15px] font-semibold text-neutral-100">
              Learn from on-screen buttons
            </div>
            <p className="mt-2 max-w-md text-sm text-neutral-400">
              Off by default. Lets Flow notice workflows inside an app, like Cut then Delete, by
              recording <span className="text-neutral-300">which button</span> you clicked and
              which browser tab you went to. Only short button and menu labels are kept, or a
              rough position in the window for apps that don't expose their buttons. When you
              highlight something, Flow notes only that you did, so a saved workflow copies or
              deletes whatever you have highlighted when you run it. Never the highlighted text,
              text fields, documents, file names, page titles, or what you type.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-neutral-500">{clickCaptureEnabled ? 'Enabled' : 'Disabled'}</span>
            <ToggleSwitch
              checked={clickCaptureEnabled}
              onChange={setClickCaptureEnabled}
              label="Learn from on-screen buttons"
            />
          </div>
        </div>
      )}

      {enabled && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="mb-2 font-display text-[15px] font-semibold text-neutral-100">
            Patterns detected today
          </div>
          {patterns.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Nothing yet. Patterns need repeated use (the same shortcut a handful of times) before
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
