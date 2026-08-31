import { useEffect, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

interface OnboardingStepTransitionProps {
  /** Changing this key re-triggers the enter transition — pass the current
   *  onboarding step id. */
  stepKey: string
  children: ReactNode
}

/** A small, subtle fade/rise on every screen change (~200ms, within the
 *  brief's 150-300ms target). Skips the animation entirely under
 *  prefers-reduced-motion rather than just shortening it. */
export function OnboardingStepTransition({ stepKey, children }: OnboardingStepTransitionProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }
    setIsVisible(false)
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
    // Re-run only when the step actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}
