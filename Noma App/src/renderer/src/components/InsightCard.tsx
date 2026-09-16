import type { WorkflowChainStep } from '../lib/workflowChain'
import { AppIcon } from './AppIcon'
import { WorkflowChain } from './WorkflowChain'

interface InsightCardProps {
  /** The insight itself, in plain language — "You use SEARCH 31 times this
   *  week," never a raw stat tile. */
  text: string
  /** An optional secondary line — the reasoning or extra context behind
   *  the insight, kept visually quieter than `text`. */
  hint?: string
  /** An optional single recommended action — never more than one; this is
   *  a suggestion to consider, not a menu. */
  action?: { label: string; onClick: () => void }
  /** The application this insight is about, when the underlying pattern
   *  has one (a workflow insight does; a control-usage insight doesn't) —
   *  shown as a real `AppIcon` beside the text. Only used when `chain`
   *  isn't a real multi-step chain — once there is one, its own nodes
   *  already carry every application's icon, so a second standalone one
   *  next to the text would just repeat the first node. */
  applicationId?: string | null
  applicationName?: string | null
  /** The pattern's own visual workflow, when it has one — same node
   *  language as the Noma Moment and Learned Actions (see
   *  `lib/workflowChain.ts`'s `patternChainSteps`), so a multi-app pattern
   *  reads as a real workflow here too, not just a sentence. */
  chain?: WorkflowChainStep[] | null
}

/**
 * One large behavioral observation on the Learning page — a plain
 * sentence, not a metric tile, now paired with the same real-icon workflow
 * visualization the rest of the app uses whenever the pattern actually has
 * a chain worth showing. A thin rule separates rows; nothing here is
 * boxed into a card.
 */
export function InsightCard({ text, hint, action, applicationId, applicationName, chain }: InsightCardProps) {
  const showsChain = Boolean(chain && chain.length > 1)

  return (
    <div className="flex items-start justify-between gap-6 border-b border-base-700 py-5 transition-colors last:border-b-0 hover:bg-base-800/60">
      <div className="flex min-w-0 items-start gap-3">
        {!showsChain && applicationId && (
          <AppIcon applicationId={applicationId} name={applicationName ?? text} size={28} variant="tile" />
        )}
        <div className="min-w-0">
          <p className="text-base leading-snug text-neutral-100">{text}</p>
          {hint && <p className="mt-1.5 text-sm text-neutral-600">{hint}</p>}
          {showsChain && chain && (
            <div className="mt-4">
              <WorkflowChain steps={chain} size="md" />
            </div>
          )}
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
