import { OnboardingButton } from './OnboardingButton'

const SEQUENCE = [
  { label: 'You repeat a shortcut', detail: 'The same combo, in the same app, a few times' },
  { label: 'Flow notices the pattern', detail: 'Deterministic pattern detection, not a guess' },
  { label: 'Flow suggests a control', detail: 'One click assigns it — Flow never assigns it itself' }
]

interface OnboardingFlowPrivacyScreenProps {
  onEnable: () => void
  onSkip: () => void
}

/**
 * Screen 3 — every privacy claim here was checked against the actual
 * implementation, not written first and verified never:
 * - "Processes locally": pattern detection (workflow/patternDetection.ts)
 *   and the suggestion engine (ai/localProvider.ts's LocalRuleBasedProvider)
 *   both run in-process against the local SQLite file
 *   (database/db.ts — better-sqlite3, no server). There is no network call
 *   anywhere in src/main — confirmed by grepping for fetch/http/net.request.
 * - "Pause Flow anytime": the existing workflow-monitoring toggle
 *   (settingsRepository.ts / SET_WORKFLOW_MONITORING_ENABLED) — the same
 *   switch Settings' WorkflowMonitoringPanel already exposes.
 * - "Clear learned data anytime": privacy/dataManagement.ts's
 *   clearLearningData(), already wired to Settings' DataManagementPanel.
 */
export function OnboardingFlowPrivacyScreen({ onEnable, onSkip }: OnboardingFlowPrivacyScreenProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-3xl font-semibold text-neutral-50">Meet Flow</h1>
      <p className="mt-2 text-sm text-neutral-400">Flow watches how you work.</p>
      <p className="mt-4 max-w-sm text-sm text-neutral-500">
        Noma looks for repetitive shortcuts and workflows that could become dedicated controls.
      </p>

      <div className="mt-8 flex w-full items-stretch justify-center gap-2 sm:gap-3">
        {SEQUENCE.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2 sm:gap-3">
            <div className="w-32 rounded-xl border border-white/10 bg-base-900 px-3 py-4 sm:w-36">
              <div className="text-sm font-medium text-neutral-200">{step.label}</div>
              <div className="mt-1 text-[11px] text-neutral-600">{step.detail}</div>
            </div>
            {index < SEQUENCE.length - 1 && (
              <span className="shrink-0 text-neutral-700" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 w-full max-w-sm rounded-xl border border-white/10 bg-base-900 px-5 py-4 text-left">
        <div className="text-sm font-medium text-neutral-100">Your data stays on your computer.</div>
        <p className="mt-1.5 text-xs text-neutral-500">
          Flow processes your workflow locally. You can pause Flow or clear learned data anytime in
          Settings.
        </p>
      </div>

      <div className="mt-10 flex items-center gap-6">
        <OnboardingButton variant="secondary" onClick={onSkip}>
          Not now
        </OnboardingButton>
        <OnboardingButton onClick={onEnable}>Enable Flow</OnboardingButton>
      </div>
    </div>
  )
}
