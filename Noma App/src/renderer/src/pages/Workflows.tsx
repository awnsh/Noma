import { useSuggestionsStore } from '../stores/suggestionsStore'
import { useLearnedActions, type LearnedAction } from '../lib/useLearnedActions'
import { NomaMoment } from '../components/NomaMoment'
import { WorkflowCard } from '../components/WorkflowCard'
import { EmptyState } from '../components/EmptyState'
import { useUiStore } from '../stores/uiStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { CARD } from '../lib/surfaces'
import { COMMAND_MODIFIERS_COPY } from '../lib/platform'
import { useStoreSync } from '../lib/useStoreSync'
import { latestRunFor, useActionHistory } from '../lib/useActionHistory'

/**
 * Workflows: "what has Noma learned that I actually do?"
 *
 * Deliberately not a new data model. Pending suggestions come from the same
 * `useSuggestionsStore` Home's hero and Controls' `SuggestionsPanel` already
 * read, and already-added workflows come from the same `useLearnedActions`
 * Home's preview and Controls' list already read. This page's only job is
 * to give that existing lifecycle (Noma notices → you review → you add it
 * → it's yours to use) a place where the whole arc is visible at once,
 * as real objects rather than list rows. Nothing here is fabricated: an
 * empty section is shown as empty, never padded with example cards.
 */
export function Workflows() {
  const { suggestions, isLoading: suggestionsLoading, refresh, subscribe, resolve } = useSuggestionsStore()
  const learnedActions = useLearnedActions()
  const openMacro = useUiStore((state) => state.openMacro)
  const { enabled: flowEnabled, isLoading: flowLoading, refresh: refreshFlow, setEnabled: setFlowEnabled } =
    useWorkflowStore()

  useStoreSync({ refresh, subscribe }, { refresh: refreshFlow })

  const actionHistory = useActionHistory()
  // Labels held by exactly one workflow's control: the only ones a log line
  // without a controlId can be pinned on.
  const labelCounts = new Map<string, number>()
  for (const action of learnedActions ?? []) {
    for (const assignment of action.assignments) {
      labelCounts.set(assignment.label, (labelCounts.get(assignment.label) ?? 0) + 1)
    }
  }
  const unambiguousLabels = new Set([...labelCounts].filter(([, count]) => count === 1).map(([label]) => label))
  const lastRunFailure = (action: LearnedAction): string | undefined => {
    const latest = latestRunFor(actionHistory, action.assignments, unambiguousLabels)
    return latest && !latest.lastOk ? (latest.lastReason ?? 'no reason given') : undefined
  }

  const isLoading = suggestionsLoading || learnedActions === null
  const hasPending = suggestions.length > 0
  const hasLearned = (learnedActions?.length ?? 0) > 0

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <div className="mb-14">
        <h1 className="font-display text-2xl font-semibold text-neutral-100">Workflows</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-500">
          Flow notices shortcut sequences you repeat. You review the exact steps, then save one to a Glide zone so a
          single swipe runs it. Nothing is saved or run without you.
        </p>
      </div>

      {!flowLoading && !flowEnabled && (
        <div className={`mb-12 flex items-start justify-between gap-6 p-5 ${CARD}`}>
          <div>
            <p className="text-sm font-medium text-neutral-100">Flow is off, so Noma isn&apos;t noticing anything.</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
              When on, Flow records which app is in front and which shortcuts you press that hold {COMMAND_MODIFIERS_COPY}.
              Never what you type, never screenshots.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void setFlowEnabled(true)}
            className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
          >
            Turn on Flow
          </button>
        </div>
      )}

      {isLoading ? null : !hasPending && !hasLearned ? (
        // Case 1: nothing at all. The page should read as active, not empty.
        flowEnabled && (
          <EmptyState
            title="Nothing noticed yet."
            hint={`Repeat the same shortcut sequence about three times and it shows up here. Shortcuts that hold ${COMMAND_MODIFIERS_COPY} count; plain typing never does.`}
          />
        )
      ) : (
        <>
          {hasPending && (
            <section className="mb-14">
              <h2 className="mb-1 font-display text-lg font-semibold text-neutral-100">Suggestions</h2>
              <p className="mb-5 text-sm text-neutral-600">Patterns Noma has detected, waiting on you.</p>
              <div className="space-y-4 mc-stagger">
                {suggestions.map((suggestion) => (
                  <NomaMoment
                    key={suggestion.id}
                    suggestion={suggestion}
                    variant="hero"
                    onReject={(id) => resolve(id, 'rejected')}
                    onDismiss={(id) => resolve(id, 'dismissed')}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-1 font-display text-lg font-semibold text-neutral-100">Your workflows</h2>
            <p className="mb-5 text-sm text-neutral-600">
              {hasLearned
                ? 'Click one to open it in Macro Studio.'
                : 'Workflows you save appear here, with the Glide zone that runs them.'}
            </p>
            {hasLearned ? (
              <div className="space-y-4 mc-stagger">
                {(learnedActions ?? []).map((action) => (
                  <WorkflowCard
                    key={action.macro.id}
                    action={action}
                    onSelect={() => openMacro(action.macro.id)}
                    lastRunFailure={lastRunFailure(action)}
                  />
                ))}
              </div>
            ) : (
              hasPending && (
                <p className="text-sm text-neutral-600">
                  Review the suggestions above to add your first one.
                </p>
              )
            )}
          </section>
        </>
      )}

    </div>
  )
}
