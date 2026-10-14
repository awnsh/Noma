import { WorkflowMonitoringPanel } from '../components/WorkflowMonitoringPanel'
import { ArrowRightIcon, CheckIcon, CrossIcon } from '../components/icons'
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
            <div className="font-display text-[15px] font-semibold text-neutral-100">Glide</div>
            <p className={`mt-2 max-w-md text-sm ${glideStatus.tone === 'problem' ? 'text-error' : 'text-neutral-400'}`}>
              {glideStatus.text}
            </p>
            <button type="button" onClick={() => setActivePage('holo')} className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-200 underline decoration-white/20 underline-offset-[3px] hover:text-neutral-50">
              Zones and actions
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
          {glide?.platformSupported && (
            <ToggleSwitch checked={glide.enabled} onChange={(checked) => void setGlideEnabled(checked)} label="Glide" />
          )}
        </div>
      </section>

      <section className={`mb-8 px-5 py-4 ${CARD}`}>
        <div className="font-display text-[15px] font-semibold text-neutral-100">What Flow sees</div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 text-xs font-medium text-neutral-400">
              Flow sees
            </div>
            <ul className="space-y-1 text-xs text-neutral-400">
              {COLLECTED.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckIcon className="mt-px h-3.5 w-3.5 shrink-0 text-neutral-200" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium text-neutral-400">
              Flow never sees
            </div>
            <ul className="space-y-1 text-xs text-neutral-500">
              {NEVER_COLLECTED.map((item) => (
                <li key={item} className="flex gap-2">
                  <CrossIcon className="mt-px h-3.5 w-3.5 shrink-0 text-neutral-500" />
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
            <div className="font-display text-[15px] font-semibold text-neutral-100">Developer tools</div>
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
