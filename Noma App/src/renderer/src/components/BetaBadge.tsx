import { IS_BETA } from '@shared/constants'

/** A small muted "Beta" label: every downloaded build is a beta until IS_BETA
 *  flips, and this is the in-app reminder of that. Renders nothing after. */
export function BetaBadge({ className = '' }: { className?: string }) {
  if (!IS_BETA) return null
  return (
    <span
      title="Noma is in beta. The final version isn't out yet, so things may change."
      className={`shrink-0 text-xs text-neutral-500 ${className}`}
    >
      Beta
    </span>
  )
}
