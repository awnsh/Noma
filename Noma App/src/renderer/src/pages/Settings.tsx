import { WorkflowMonitoringPanel } from '../components/WorkflowMonitoringPanel'
import { useEffect } from 'react'
import { DataManagementPanel } from '../components/DataManagementPanel'
import { ReportProblemPanel } from '../components/ReportProblemPanel'
import { UpdatesPanel } from '../components/UpdatesPanel'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { useGlideStore } from '../stores/glideStore'
import { useUiStore } from '../stores/uiStore'
import { useOnboardingStore } from '../stores/onboardingStore'
import { glideStatusLine } from '../lib/glideMessages'
import { CARD } from '../lib/surfaces'
import { COMMAND_MODIFIERS_COPY } from '../lib/platform'

const COLLECTED = [
  'Which application is active',
  `Shortcuts that hold ${COMMAND_MODIFIERS_COPY}`,
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
  const { state: glide, refresh: refreshGlide, setEnabled: setGlideEnabled } = useGlideStore()
  const { developerTools, setDeveloperTools, setActivePage } = useUiStore()
  const saveOnboarding = useOnboardingStore((state) => state.save)

  useEffect(() => {
    void refreshGlide()
  }, [refreshGlide])

  const glideStatus = glideStatusLine(glide)

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display text-xl font-semibold text-neutral-100">Settings</h1>
      </div>

      <section className={`mb-8 px-5 py-4 ${CARD}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-500">Glide</div>
            <p className={`mt-2 max-w-md text-sm ${glideStatus.tone === 'problem' ? 'text-error' : 'text-neutral-400'}`}>
              {glideStatus.text}
            </p>
            <button type="button" onClick={() => setActivePage('holo')} className="mt-2 text-xs text-accent hover:opacity-80">
              Zones and actions →
            </button>
          </div>
          {glide?.platformSupported && (
            <ToggleSwitch checked={glide.enabled} onChange={(checked) => void setGlideEnabled(checked)} label="Glide" />
          )}
        </div>
      </section>

      <section className={`mb-8 px-5 py-4 ${CARD}`}>
        <div className="text-xs uppercase tracking-widest text-neutral-500">Flow Learning</div>
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

      <UpdatesPanel />

      <ReportProblemPanel />

      <section className={`mb-8 px-5 py-4 ${CARD}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-500">Developer tools</div>
            <p className="mt-2 max-w-md text-sm text-neutral-400">
              Adds the device simulator, Demo Mode and the device log to the sidebar.
            </p>
            {developerTools && (
              <button
                type="button"
                onClick={() => void saveOnboarding({ completed: false, step: 'welcome' })}
                className="mt-2 text-xs text-accent hover:opacity-80"
              >
                Show the first-run setup again
              </button>
            )}
          </div>
          <ToggleSwitch checked={developerTools} onChange={setDeveloperTools} label="Developer tools" />
        </div>
      </section>
    </div>
  )
}
