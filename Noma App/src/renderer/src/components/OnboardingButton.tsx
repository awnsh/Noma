import type { ReactNode } from 'react'

/** Shared focus-visible ring for every custom interactive element in
 *  onboarding (buttons, selectable tiles) — the dark background means the
 *  browser's default focus outline can be too faint to rely on. */
export const ONBOARDING_FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface OnboardingButtonProps {
  onClick: () => void
  children: ReactNode
  /** 'primary' is the one clear call-to-action per screen (solid fill —
   *  deliberately bolder than the app's usual muted-outline buttons, since
   *  onboarding is meant to read as its own premium moment, not another
   *  dashboard panel). 'secondary' is a plain-text action alongside it. */
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function OnboardingButton({
  onClick,
  children,
  variant = 'primary',
  disabled = false
}: OnboardingButtonProps) {
  if (variant === 'secondary') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`rounded-full px-4 py-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40 ${ONBOARDING_FOCUS_RING}`}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full bg-accent px-7 py-3 text-sm font-medium text-base-950 transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${ONBOARDING_FOCUS_RING}`}
    >
      {children}
    </button>
  )
}
