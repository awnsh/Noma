import { useEffect, useState } from 'react'
import type { DetectedPattern, LearningStats } from '@shared/types'
import { useFlowStore } from '../stores/flowStore'
import { useUiStore } from '../stores/uiStore'
import { InsightCard } from '../components/InsightCard'
import { EmptyState } from '../components/EmptyState'
import { workflowStepPlainText } from '../lib/insights'
import { patternChainSteps } from '../lib/workflowChain'
import { CARD } from '../lib/surfaces'

/**
 * Learning — "what Noma is learning": a plain-language read of the
 * behavioral model behind every suggestion, told as large observations,
 * not an analytics dashboard. Every sentence here is derived straight from
 * real, already-captured data — nothing here is generated copy.
 */
export function Learning() {
  const { context } = useFlowStore()
  const setActivePage = useUiStore((state) => state.setActivePage)
  const [patterns, setPatterns] = useState<DetectedPattern[] | null>(null)
  const [appNames, setAppNames] = useState<Record<string, string | null>>({})
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [underused, setUnderused] = useState<{ label: string; count: number; maxCount: number } | null>(null)

  const refresh = async (): Promise<void> => {
    const [nextPatterns, nextStats, applications] = await Promise.all([
      window.flow.getDetectedPatterns(),
      window.flow.getLearningStats(),
      window.flow.getAllApplications()
    ])
    setPatterns(nextPatterns)
    setStats(nextStats)
    setAppNames(Object.fromEntries(applications.map((app) => [app.id, app.name])))

    const controls = context.profile?.controls ?? []
    if (controls.length === 4) {
      const usage = await window.flow.getControlUsageStats()
      const usageById = new Map(usage.map((stat) => [stat.controlId, stat.count]))
      const counts = controls.map((control) => ({ label: control.label, count: usageById.get(control.id) ?? 0 }))
      const maxCount = Math.max(...counts.map((c) => c.count))
      const min = counts.reduce((lowest, c) => (c.count < lowest.count ? c : lowest), counts[0])
      // Only worth mentioning once there's enough real activity to compare
      // against, and the gap is genuinely lopsided — not on a handful of
      // presses where the difference is just noise.
      if (maxCount >= 10 && min.count <= maxCount / 5) {
        setUnderused({ label: min.label, count: min.count, maxCount })
      } else {
        setUnderused(null)
      }
    }
  }

  useEffect(() => {
    void refresh()
    const unsubscribe = window.flow.onSuggestionsChanged(() => void refresh())
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.profile?.id])

  const crossAppInsights = (patterns ?? []).filter(
    (pattern) => pattern.kind === 'crossAppWorkflow' || pattern.kind === 'multiStepWorkflow'
  )

  return (
    <div className="mx-auto max-w-2xl px-12 py-16">
      <div className="mb-12">
        <h1 className="font-display text-2xl font-semibold text-neutral-100">What Noma is learning</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Real patterns, counted from real activity — never a guess.
        </p>
      </div>

      <section className="mb-12">
        {patterns === null ? (
          <p className="text-sm text-neutral-600">Loading…</p>
        ) : crossAppInsights.length === 0 && !underused ? (
          <EmptyState
            title="Nothing to report yet today."
            hint="Once you repeat a workflow, Noma will describe what it noticed here."
          />
        ) : (
          <div className={`${CARD} px-5`}>
            {crossAppInsights.map((pattern) => {
              const patternApplicationId =
                pattern.kind === 'multiStepWorkflow' ? pattern.contextApplicationId : (pattern.applicationIds[0] ?? null)
              return (
                <InsightCard
                  key={pattern.id}
                  text={workflowStepPlainText(pattern, appNames)}
                  applicationId={patternApplicationId}
                  applicationName={patternApplicationId ? appNames[patternApplicationId] : null}
                  chain={patternChainSteps(pattern, appNames)}
                />
              )
            })}
            {underused && (
              <InsightCard
                text={`You rarely use ${underused.label}.`}
                hint={`${underused.count} use${underused.count === 1 ? '' : 's'} — far less than your other controls. Noma may eventually recommend replacing it.`}
                action={{ label: 'Review', onClick: () => setActivePage('controls') }}
              />
            )}
          </div>
        )}
      </section>

      <div className="mb-12 h-px bg-base-700" />

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-neutral-100">How Noma decides</h2>
        <p className="mb-5 text-sm text-neutral-600">
          Noma only suggests something once it's genuinely repeated — never automatic.
        </p>
        {!stats ? (
          <p className="text-sm text-neutral-600">Loading…</p>
        ) : (
          <div className={`${CARD} px-5`}>
            {stats.kinds.map((kind) => {
              const total = kind.accepted + kind.rejected
              return (
                <InsightCard
                  key={kind.kind}
                  text={kind.description}
                  hint={
                    total === 0
                      ? "Noma hasn't suggested this yet."
                      : `You've said yes ${kind.accepted} time${kind.accepted === 1 ? '' : 's'} and no ${kind.rejected} time${kind.rejected === 1 ? '' : 's'} to a suggestion like this.`
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
