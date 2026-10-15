import type { ReactNode } from 'react'

/** Shared focus-visible ring for every custom interactive element in
 *  onboarding (buttons, selectable tiles). The dark background means the
 *  browser's default focus outline can be too faint to rely on. */
export const ONBOARDING_FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface OnboardingButtonProps {
  onClick: () => void
  children: ReactNode
  /** 'primary' is the one clear call-to-action per screen (solid fill).
   *  Deliberately bolder than the app's usual muted-outline buttons, since
   *  onboarding is meant to read as its own premium moment, not another
   *  dashboard panel. 'secondary' is a plain-text action alongside it. */
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
        className={`rounded-md px-4 py-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40 ${ONBOARDING_FOCUS_RING}`}
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
      className={`rounded-md bg-accent px-6 py-2 text-sm font-semibold text-base-950 transition-colors duration-150 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 ${ONBOARDING_FOCUS_RING}`}
    >
      {children}
    </button>
  )
}
