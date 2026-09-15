import { useEffect, useState } from 'react'
import type { Application, Control, ControlUsageStat, Macro } from '@shared/types'
import { useFlowStore } from '../stores/flowStore'
import { ControlTile } from '../components/ControlTile'
import { ControlEditorModal } from '../components/ControlEditorModal'
import { LearnedActionCard } from '../components/LearnedActionCard'
import { SuggestionsPanel } from '../components/SuggestionsPanel'
import { EmptyState } from '../components/EmptyState'
import { AppLogo } from '../components/AppLogo'
import { macroChainSteps, type WorkflowChainStep } from '../lib/workflowChain'

interface LearnedAction {
  macro: Macro
  chain: WorkflowChainStep[]
  usageCount: number
  applicationId: string | null
  applicationName: string | null
}

/**
 * Controls — the fuller view of "your interface": the live 4-control grid
 * for whatever application is active right now (same data as Home, but
 * editable here — click a tile to configure it, reusing the exact same
 * ControlEditorModal Profiles already uses), and, separately, every action
 * Noma has ever learned from a repeated workflow, wherever it's assigned.
 * The two stay visually distinct through metadata and typography alone
 * (see LearnedActionCard) — never a color badge marking one as special.
 */
export function Controls() {
  const { context, refresh, subscribeToContext } = useFlowStore()
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [learnedActions, setLearnedActions] = useState<LearnedAction[] | null>(null)

  useEffect(() => {
    refresh()
    const unsubscribe = subscribeToContext()
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadLearnedActions = async (): Promise<void> => {
    const [macros, applications, usageStats] = await Promise.all([
      window.flow.getMacros(),
      window.flow.getAllApplications(),
      window.flow.getControlUsageStats()
    ])

    const applicationNames = Object.fromEntries(applications.map((app: Application) => [app.id, app.name]))
    const usageByControlId = new Map<string, ControlUsageStat>(usageStats.map((stat) => [stat.controlId, stat]))

    const learned = macros.filter((macro) => macro.trigger === 'flow-control')
    const withContext = await Promise.all(
      learned.map(async (macro): Promise<LearnedAction> => {
        const referencing = await window.flow.getControlsReferencingMacro(macro.id)
        const usageCount = referencing.reduce(
          (sum, ref) => sum + (usageByControlId.get(ref.controlId)?.count ?? 0),
          0
        )
        return {
          macro,
          chain: macroChainSteps(macro.actions, applicationNames),
          usageCount,
          applicationId: referencing[0]?.applicationId ?? null,
          applicationName: referencing[0]?.applicationName ?? null
        }
      })
    )

    setLearnedActions(withContext)
  }

  useEffect(() => {
    void loadLearnedActions()
    const unsubscribe = window.flow.onSuggestionsChanged(() => void loadLearnedActions())
    return unsubscribe
  }, [])

  const { application, profile } = context
  const controls: Control[] = profile?.controls ?? []

  return (
    <div className="mx-auto max-w-2xl px-12 py-16">
      <div className="mb-14">
        <h1 className="font-display text-2xl font-semibold text-neutral-100">Controls</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your interface right now, and every action Noma has learned from watching how you work.
        </p>
      </div>

      <section className="mb-14">
        <h2 className="mb-1 font-display text-lg font-semibold text-neutral-100">Active controls</h2>
        <p className="mb-5 flex items-center gap-1.5 text-sm text-neutral-600">
          {application ? (
            <>
              For
              <AppLogo applicationId={application.id} name={application.name} className="h-4 w-4" />
              <span className="text-neutral-100">{application.name}</span>. Click a control to change it.
            </>
          ) : (
            'Open an application Noma knows to see its controls.'
          )}
        </p>
        {profile ? (
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((slot) => {
              const control = controls.find((item) => item.slot === slot)
              return (
                <button key={slot} type="button" onClick={() => setEditingSlot(slot)} className="text-left">
                  <ControlTile slot={slot} control={control} />
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="Noma will build your interface as it learns."
            hint="Keep working normally — controls appear here once Noma has something to put on them."
          />
        )}
        {editingSlot !== null && application && (
          <ControlEditorModal
            applicationId={application.id}
            applicationName={application.name}
            slot={editingSlot}
            control={controls.find((control) => control.slot === editingSlot)}
            onClose={() => setEditingSlot(null)}
            onSaved={() => {
              refresh()
              void loadLearnedActions()
            }}
          />
        )}
      </section>

      <section className="mb-14">
        <h2 className="mb-1 font-display text-lg font-semibold text-neutral-100">Noma noticed</h2>
        <p className="mb-5 text-sm text-neutral-600">Pending workflows, waiting on you.</p>
        <SuggestionsPanel />
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-neutral-100">Learned actions</h2>
        <p className="mb-5 text-sm text-neutral-600">
          Every action Noma created from a workflow it noticed you repeat.
        </p>
        {learnedActions === null ? null : learnedActions.length === 0 ? (
          <EmptyState
            title="Noma hasn't learned an action yet."
            hint="Keep using your computer normally. Repeated workflows will appear here once Noma notices one."
          />
        ) : (
          <div>
            {learnedActions.map(({ macro, chain, usageCount, applicationId, applicationName }) => (
              <LearnedActionCard
                key={macro.id}
                name={macro.name}
                chain={chain}
                usageCount={usageCount}
                applicationId={applicationId}
                applicationName={applicationName}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
