import type { WorkflowChainStep } from '../lib/workflowChain'
import { WorkflowChain } from './WorkflowChain'
import { AppIcon } from './AppIcon'

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
 * ("Created from a repeated workflow," in the quiet secondary tier) plus
 * the real application mark it was learned in — no color badge, no
 * sparkle, nothing marking it as "AI." When the workflow's chain already
 * shows more than one app (`WorkflowChain` below), that sequence carries
 * the identity on its own and the leading icon is skipped so the row
 * doesn't show the same mark twice. A plain border separates rows;
 * nothing here is boxed into its own card.
 */
export function LearnedActionCard({ name, chain, usageCount, applicationId, applicationName }: LearnedActionCardProps) {
  const showsOwnChain = chain.length > 1

  return (
    <div className="border-b border-base-700 py-4 transition-colors last:border-b-0 hover:bg-base-800/60">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {!showsOwnChain && applicationId && (
            <AppIcon applicationId={applicationId} name={applicationName ?? name} size={22} variant="tile" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-neutral-100">{name}</div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Created from a repeated workflow{applicationName ? ` · ${applicationName}` : ''}
            </p>
            {showsOwnChain && (
              <div className="mt-2.5">
                <WorkflowChain steps={chain} />
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 text-xs text-neutral-500">
          Used {usageCount} time{usageCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  )
}
