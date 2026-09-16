import DemoAppIcon from './appGlyphIcons'

export type DemoChainStep = { kind: 'app'; appId: string; label: string } | { kind: 'shortcut'; label: string }

/**
 * Ported from the real app's `components/WorkflowChain.tsx` — an app step
 * gets its real (glyph) `AppIcon`, a shortcut step is set in mono with a
 * thin border, arrows between. No fill, no glow, no color coding beyond
 * that distinction — the real component's whole point is restraint, so this
 * preview doesn't invent decoration the actual app doesn't have. Distinct
 * from this site's own marketing `WorkflowChain.tsx` (Problem section),
 * which deliberately uses real brand icons for a different job — don't
 * confuse the two.
 */
export default function DemoWorkflowChain({ steps, size = 'md' }: { steps: DemoChainStep[]; size?: 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'
  const iconSize = size === 'lg' ? 18 : 16

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${textSize}`}>
      {steps.map((step, index) => (
        <span key={`${step.label}-${index}`} className="flex items-center gap-x-2">
          {step.kind === 'app' ? (
            <span className="flex items-center gap-1.5 text-base-100">
              <DemoAppIcon appId={step.appId} name={step.label} size={iconSize} />
              {step.label}
            </span>
          ) : (
            <span className="rounded-md border border-base-700 px-2.5 py-1 font-mono text-base-100">{step.label}</span>
          )}
          {index < steps.length - 1 && (
            <span aria-hidden className="text-base-600">
              &rarr;
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
