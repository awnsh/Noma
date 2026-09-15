import type { WorkflowChainStep } from '../lib/workflowChain'
import { WorkflowChain } from './WorkflowChain'
import { AppLogo } from './AppLogo'

interface LearnedActionCardProps {
  name: string
  chain: WorkflowChainStep[]
  usageCount: number
  applicationId: string | null
  applicationName: string | null
}

/**
 * One row in the Controls page's "Learned actions" list — an action Noma
 * created from a workflow it noticed, not something hand-configured. The
 * distinction is communicated entirely through metadata and typography
 * ("Created from a repeated workflow," in the quiet secondary tier) — no
 * color, no icon, no badge marking it as "AI." A plain border separates
 * rows; nothing here is boxed into its own card.
 */
export function LearnedActionCard({
  name,
  chain,
  usageCount,
  applicationId,
  applicationName
}: LearnedActionCardProps) {
  return (
    <div className="border-b border-base-700 py-4 transition-colors last:border-b-0 hover:bg-base-800/60">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-neutral-100">{name}</div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
            Created from a repeated workflow
            {applicationName && (
              <>
                <span aria-hidden>·</span>
                <AppLogo applicationId={applicationId} name={applicationName} className="h-3.5 w-3.5" />
                {applicationName}
              </>
            )}
          </p>
          {chain.length > 1 && (
            <div className="mt-2.5">
              <WorkflowChain steps={chain} />
            </div>
          )}
        </div>
        <div className="shrink-0 text-xs text-neutral-500">
          Used {usageCount} time{usageCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  )
}
