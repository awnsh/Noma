import { useEffect, useState } from 'react'
import type { Application, ControlUsageStat, Macro } from '@shared/types'
import { macroChainSteps, type WorkflowChainStep } from './workflowChain'

export interface LearnedAction {
  macro: Macro
  chain: WorkflowChainStep[]
  usageCount: number
  applicationId: string | null
  applicationName: string | null
}

/**
 * Every macro Noma has actually learned from a repeated workflow (as
 * opposed to a hand-configured one), with the real usage count and
 * application context needed to render a `LearnedActionCard`. Shared by
 * Home (the most recent few, as a preview) and Controls (the full list) —
 * both need the exact same real data, just a different amount of it.
 */
export function useLearnedActions(): LearnedAction[] | null {
  const [learnedActions, setLearnedActions] = useState<LearnedAction[] | null>(null)

  useEffect(() => {
    const load = async (): Promise<void> => {
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

    void load()
    const unsubscribe = window.flow.onSuggestionsChanged(() => void load())
    return unsubscribe
  }, [])

  return learnedActions
}
