import { useState } from 'react'
import { usePrivacyStore } from '../stores/privacyStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { useFlowStore } from '../stores/flowStore'
import { useOnboardingStore } from '../stores/onboardingStore'

type PendingAction = 'clear' | 'delete' | null

/**
 * Clear/Export/Delete data (this phase's section 13). "Export" isn't built
 * — there's nothing yet worth exporting beyond what Clear/Delete already
 * make legible on this same page (see README's "what remains incomplete").
 * Each destructive action requires an explicit second click (inline, not a
 * separate modal) before it runs — mirrors the "warns first" pattern the
 * Macro Studio already uses for deleting a referenced macro.
 */
export function DataManagementPanel() {
  const { isBusy, lastAction, clearLearningData, deleteAllData, dismiss } = usePrivacyStore()
  const refreshWorkflow = useWorkflowStore((state) => state.refresh)
  const refreshFlow = useFlowStore((state) => state.refresh)
  const loadOnboarding = useOnboardingStore((state) => state.load)
  const [pending, setPending] = useState<PendingAction>(null)

  const handleConfirm = async (action: PendingAction): Promise<void> => {
    if (action === 'clear') {
      await clearLearningData()
    } else if (action === 'delete') {
      await deleteAllData()
    }
    setPending(null)
    const refreshes = [refreshWorkflow(), refreshFlow()]
    // deleteAllData() wipes the whole `settings` table, which is also
    // where onboarding's progress lives (see onboardingRepository.ts) — a
    // factory reset really is "the state a fresh install starts in," so
    // re-load it here too, rather than only picking that up on next
    // relaunch (App.tsx only loads it once, on mount).
    if (action === 'delete') refreshes.push(loadOnboarding())
    await Promise.all(refreshes)
  }

  return (
    <section className="rounded-xl border border-white/10 bg-base-900 px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">Your Data</div>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        Everything Flow has observed and suggested is stored locally, never sent anywhere. You can
        clear it at any time.
      </p>

      {lastAction && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-accent-muted bg-accent/10 px-3 py-2 text-xs text-accent">
          <span>
            {lastAction === 'clearedLearningData'
              ? 'Learning data cleared.'
              : 'All data deleted — Noma is back to its default state.'}
          </span>
          <button type="button" onClick={dismiss} className="text-accent/70 hover:text-accent">
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton
          label="Pause Learning"
          description="Turns off workflow monitoring — same as the toggle above."
          onClick={() => window.flow.setWorkflowMonitoringEnabled(false).then(refreshWorkflow)}
        />

        {pending === 'clear' ? (
          <ConfirmRow
            prompt="Clear everything Flow has observed and suggested?"
            isBusy={isBusy}
            onConfirm={() => void handleConfirm('clear')}
            onCancel={() => setPending(null)}
          />
        ) : (
          <ActionButton
            label="Clear Learning Data"
            description="Deletes observed patterns and suggestions. Your controls and macros stay."
            onClick={() => setPending('clear')}
          />
        )}

        {pending === 'delete' ? (
          <ConfirmRow
            prompt="Delete all data? This resets Noma to a fresh install and cannot be undone."
            isBusy={isBusy}
            danger
            onConfirm={() => void handleConfirm('delete')}
            onCancel={() => setPending(null)}
          />
        ) : (
          <ActionButton
            label="Delete All Data"
            description="Full reset: profiles, controls, macros, and everything learned."
            danger
            onClick={() => setPending('delete')}
          />
        )}
      </div>
    </section>
  )
}

function ActionButton({
  label,
  description,
  danger,
  onClick
}: {
  label: string
  description: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={description}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
        danger
          ? 'border-red-900/60 text-red-400 hover:border-red-700 hover:bg-red-950/40'
          : 'border-white/10 text-neutral-300 hover:border-accent-muted hover:text-neutral-100'
      }`}
    >
      {label}
    </button>
  )
}

function ConfirmRow({
  prompt,
  isBusy,
  danger,
  onConfirm,
  onCancel
}: {
  prompt: string
  isBusy: boolean
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-1.5 text-xs ${
        danger ? 'border-red-900/60 bg-red-950/20' : 'border-accent-muted bg-accent/10'
      }`}
    >
      <span className={danger ? 'text-red-300' : 'text-accent'}>{prompt}</span>
      <button
        type="button"
        disabled={isBusy}
        onClick={onConfirm}
        className={`font-semibold ${danger ? 'text-red-400 hover:text-red-300' : 'text-accent hover:text-accent/80'}`}
      >
        {isBusy ? 'Working…' : 'Confirm'}
      </button>
      <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
        Cancel
      </button>
    </div>
  )
}
