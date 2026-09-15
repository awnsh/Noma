import type { WorkflowChainStep } from '../lib/workflowChain'
import { AppLogo } from './AppLogo'

/**
 * The visual "Explorer → Chrome → VS Code" sequence — workflows are a core
 * part of Noma's identity, so this is deliberately the most considered
 * element on the page. An application step gets its real logo when Noma
 * has one, otherwise a plain monogram (see `AppLogo`) — real computer
 * behavior, moving between places, not the same kind of thing as a
 * keyboard shortcut. A shortcut step is set in JetBrains Mono with a thin
 * border (the system's own rule for technical values). No fill, no color,
 * no icon glow — the distinction between step kinds is the only visual
 * variety here, and it's earned by what actually happened, not decoration.
 */
export function WorkflowChain({ steps, size = 'md' }: { steps: WorkflowChainStep[]; size?: 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${textSize}`}>
      {steps.map((step, index) => (
        <span key={`${step.label}-${index}`} className="flex items-center gap-x-2">
          {step.kind === 'app' ? (
            <span className="flex items-center gap-1.5 text-neutral-100">
              <AppLogo applicationId={step.applicationId} name={step.label} />
              {step.label}
            </span>
          ) : (
            <span className="rounded-md border border-base-700 px-2.5 py-1 font-mono text-neutral-100">
              {step.label}
            </span>
          )}
          {index < steps.length - 1 && (
            <span aria-hidden className="text-neutral-600">
              →
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
