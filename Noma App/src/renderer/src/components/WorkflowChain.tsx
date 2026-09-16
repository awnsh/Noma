import type { WorkflowChainStep } from '../lib/workflowChain'
import { AppIcon } from './AppIcon'

/**
 * The visual "Explorer → Chrome → VS Code" sequence — workflows are a core
 * part of Noma's identity, so this is deliberately the most considered
 * element on the page. An application step gets its real `AppIcon` (real
 * computer behavior — moving between places, made recognizable by the
 * actual app's own mark); a shortcut step is set in JetBrains Mono with a
 * thin border (the system's own rule for technical values). No fill, no
 * glow, no decoration beyond what `AppIcon` itself earns for a recognized
 * app — the distinction between step kinds is otherwise the only visual
 * variety here, and it's earned by what actually happened, not decoration.
 */
export function WorkflowChain({ steps, size = 'md' }: { steps: WorkflowChainStep[]; size?: 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'
  const iconSize = size === 'lg' ? 18 : 16

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${textSize}`}>
      {steps.map((step, index) => (
        <span key={`${step.label}-${index}`} className="flex items-center gap-x-2">
          {step.kind === 'app' ? (
            <span className="flex items-center gap-1.5 text-neutral-100">
              <AppIcon applicationId={step.applicationId} name={step.label} size={iconSize} />
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
