import { OnboardingButton, ONBOARDING_FOCUS_RING } from './OnboardingButton'

const USE_CASES = ['Development', 'Design', 'Video', 'Writing', 'Productivity', 'Other']

interface OnboardingUseCasesScreenProps {
  selected: string[]
  onToggle: (useCase: string) => void
  onContinue: () => void
}

/** Screen 2 — multi-select, nothing required. Selection is purely a hint
 *  for which starter workflows might matter later; it never blocks
 *  progress (spec: "Do not require the user to select anything"). */
export function OnboardingUseCasesScreen({ selected, onToggle, onContinue }: OnboardingUseCasesScreenProps) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-neutral-50">
        What do you use your computer for?
      </h1>
      <p className="mt-3 text-sm text-neutral-500">This helps Noma set up your first workflows.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {USE_CASES.map((useCase) => {
          const isSelected = selected.includes(useCase)
          return (
            <button
              key={useCase}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(useCase)}
              className={`rounded-xl border px-4 py-4 text-left text-sm font-medium transition-colors duration-150 ${ONBOARDING_FOCUS_RING} ${
                isSelected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-white/10 text-neutral-300 hover:border-white/25'
              }`}
            >
              {useCase}
            </button>
          )
        })}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <span className="text-xs text-neutral-600">Optional — pick as many as apply.</span>
        <OnboardingButton onClick={onContinue}>Continue</OnboardingButton>
      </div>
    </div>
  )
}
