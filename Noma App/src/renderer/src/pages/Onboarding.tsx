import { useState } from 'react'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useUiStore } from '../stores/uiStore'
import { ONBOARDING_STEPS, stepIndexOf } from '../lib/onboardingSteps'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { OnboardingStepTransition } from '../components/OnboardingStepTransition'
import { OnboardingWelcomeScreen } from '../components/OnboardingWelcomeScreen'
import { OnboardingUseCasesScreen } from '../components/OnboardingUseCasesScreen'
import { OnboardingFlowPrivacyScreen } from '../components/OnboardingFlowPrivacyScreen'
import { OnboardingHardwareScreen } from '../components/OnboardingHardwareScreen'
import { OnboardingDemoScreen } from '../components/OnboardingDemoScreen'
import { OnboardingCompletionScreen } from '../components/OnboardingCompletionScreen'

/**
 * The onboarding orchestrator — owns navigation (which screen, back/
 * forward) and persists progress incrementally via onboardingStore, so
 * quitting mid-flow resumes at the right screen instead of restarting.
 * Rendered by App.tsx in place of AppShell/the normal page router
 * whenever onboarding isn't complete yet — this is deliberately outside
 * that router, not a page reachable from the sidebar.
 */
export function Onboarding() {
  const persistedState = useOnboardingStore((state) => state.state)
  const save = useOnboardingStore((state) => state.save)
  const setActivePage = useUiStore((state) => state.setActivePage)

  const [stepIndex, setStepIndex] = useState(() => stepIndexOf(persistedState?.step))
  // Local, controlled copy of the use-case selection so the multi-select
  // screen re-renders instantly on click; onboardingStore.save() still
  // persists every change in the background.
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(
    persistedState?.selectedUseCases ?? []
  )

  const currentStep = ONBOARDING_STEPS[stepIndex]

  function goTo(index: number, update?: Parameters<typeof save>[0]): void {
    const clamped = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, index))
    setStepIndex(clamped)
    void save({ ...update, step: ONBOARDING_STEPS[clamped] })
  }

  function toggleUseCase(useCase: string): void {
    setSelectedUseCases((previous) => {
      const next = previous.includes(useCase)
        ? previous.filter((item) => item !== useCase)
        : [...previous, useCase]
      void save({ selectedUseCases: next })
      return next
    })
  }

  return (
    <OnboardingLayout
      stepIndex={stepIndex}
      onBack={stepIndex > 0 ? () => goTo(stepIndex - 1) : undefined}
      wide={currentStep === 'demo'}
    >
      <OnboardingStepTransition stepKey={currentStep}>
        {currentStep === 'welcome' && <OnboardingWelcomeScreen onContinue={() => goTo(1)} />}

        {currentStep === 'useCases' && (
          <OnboardingUseCasesScreen
            selected={selectedUseCases}
            onToggle={toggleUseCase}
            onContinue={() => goTo(2)}
          />
        )}

        {currentStep === 'flowPrivacy' && (
          <OnboardingFlowPrivacyScreen
            onEnable={async () => {
              // The real, existing capture toggle — the same one Settings'
              // WorkflowMonitoringPanel calls. No second workflow-capture
              // system is created here.
              await window.flow.setWorkflowMonitoringEnabled(true)
              goTo(3, { flowEnabled: true })
            }}
            onSkip={() => goTo(3, { flowEnabled: false })}
          />
        )}

        {currentStep === 'hardware' && (
          <OnboardingHardwareScreen onContinue={(hardwareSkipped) => goTo(4, { hardwareSkipped })} />
        )}

        {currentStep === 'demo' && <OnboardingDemoScreen onContinue={() => goTo(5)} />}

        {currentStep === 'completion' && (
          <OnboardingCompletionScreen
            onStart={async () => {
              await save({ completed: true, step: 'completion' })
              setActivePage('dashboard')
            }}
          />
        )}
      </OnboardingStepTransition>
    </OnboardingLayout>
  )
}
