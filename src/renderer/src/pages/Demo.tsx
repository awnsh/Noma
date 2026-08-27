import { useEffect, useState } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { ControlTile } from '../components/ControlTile'
import { explainConfidence } from '../lib/explainConfidence'

/**
 * Demo Mode — "the Noma Moment". A polished, deterministic, repeatable
 * walkthrough of the core product story: an application switch changes the
 * physical controls, a repeated workflow becomes an explainable suggestion,
 * and accepting it updates a control for real. Built for presentations
 * (Purdue Innovates, investors, user testing), not just internal demoing.
 *
 * Every step drives the real pipeline — the same ApplicationContextService,
 * pattern detection, and suggestion engine any real usage does (see
 * src/main/demo/demoService.ts) — nothing here is a separate, faked path.
 * Because of that, the Dashboard/Virtual Keyboard/Developer pages will
 * honestly reflect whatever step the demo is on if you switch to them
 * mid-demo; click "Exit Demo" when done to hand control back to real
 * application detection.
 */

type DemoPhase = 'intro' | 'vscode' | 'chrome' | 'simulating' | 'suggested' | 'accepted'

const STEPS: Array<{ phase: DemoPhase; label: string }> = [
  { phase: 'intro', label: 'Start' },
  { phase: 'vscode', label: 'VS Code' },
  { phase: 'chrome', label: 'Switch app' },
  { phase: 'simulating', label: 'Repeat workflow' },
  { phase: 'suggested', label: 'Flow explains' },
  { phase: 'accepted', label: 'Control updates' }
]

export function Demo() {
  const { context, refresh: refreshContext, subscribeToContext } = useFlowStore()
  const {
    suggestions,
    refresh: refreshSuggestions,
    subscribe: subscribeSuggestions,
    assignToControl
  } = useSuggestionsStore()
  const [phase, setPhase] = useState<DemoPhase>('intro')
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    refreshContext()
    refreshSuggestions()
    const unsubscribeContext = subscribeToContext()
    const unsubscribeSuggestions = subscribeSuggestions()
    return () => {
      unsubscribeContext()
      unsubscribeSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase === 'vscode') void window.flow.setDemoApplication('code')
    if (phase === 'chrome') void window.flow.setDemoApplication('chrome')
  }, [phase])

  const demoSuggestion = suggestions.find(
    (suggestion) =>
      suggestion.applicationId === 'chrome' && suggestion.action?.kind === 'createMacroAndAssignToControl'
  )

  const handleSimulateWorkflow = async (): Promise<void> => {
    setIsWorking(true)
    setPhase('simulating')
    await window.flow.simulateDemoWorkflow()
    await refreshSuggestions()
    setIsWorking(false)
    setPhase('suggested')
  }

  const handleAddToKeyboard = async (): Promise<void> => {
    if (!demoSuggestion) return
    setIsWorking(true)
    // Slot 4 is Chrome's FIND control — replaced with the new macro, same
    // "accept always overwrites a slot the user's choice picked" rule the
    // real Suggestions panel follows (here, chosen by the script).
    await assignToControl(demoSuggestion.id, 4)
    setIsWorking(false)
    setPhase('accepted')
  }

  const handleReset = async (): Promise<void> => {
    setIsWorking(true)
    await window.flow.resetDemoData()
    await window.flow.setDemoApplication(null)
    await Promise.all([refreshContext(), refreshSuggestions()])
    setIsWorking(false)
    setPhase('intro')
  }

  const handleExit = async (): Promise<void> => {
    await window.flow.setDemoApplication(null)
    await refreshContext()
    setPhase('intro')
  }

  const controls = context.profile?.controls ?? []
  const currentStepIndex = STEPS.findIndex((s) => s.phase === phase)

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Demo</h1>
          <p className="mt-1 text-sm text-neutral-500">
            The Noma Moment — a deterministic, repeatable walkthrough of the core idea. Your
            computer changes. Your interface should too.
          </p>
        </div>
        {phase !== 'intro' && (
          <button
            type="button"
            onClick={() => void handleExit()}
            className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-400 hover:border-white/30 hover:text-neutral-200"
          >
            Exit Demo
          </button>
        )}
      </div>

      {/* Step rail */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((s, index) => (
          <div key={s.phase} className="flex flex-1 items-center gap-1">
            <div
              className={`h-1 flex-1 rounded-full ${
                index <= currentStepIndex ? 'bg-accent' : 'bg-white/10'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Live device state — the same signal Dashboard/Virtual Keyboard show */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-base-900 p-6">
        <div className="text-[10px] uppercase tracking-widest text-neutral-600">
          Current Application
        </div>
        <div className="mt-1 text-lg font-medium text-neutral-100">
          {context.application?.name ?? 'None yet — press Start below'}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((slot) => {
            const control = controls.find((c) => c.slot === slot)
            return <ControlTile key={slot} slot={slot} label={control?.label ?? null} />
          })}
        </div>
      </div>

      {/* Narration + primary action for the current phase */}
      <div className="rounded-2xl border border-white/10 bg-base-900 p-6">
        {phase === 'intro' && (
          <>
            <p className="mb-4 text-sm text-neutral-400">
              This walks through: opening VS Code, switching to Chrome, repeating a workflow,
              Flow noticing it, and turning it into one control — end to end, on real data from
              this session.
            </p>
            <button
              type="button"
              onClick={() => setPhase('vscode')}
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
            >
              Start Demo
            </button>
          </>
        )}

        {phase === 'vscode' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">VS Code is active.</p>
            <p className="mb-4 text-sm text-neutral-400">
              Noma loaded VS Code's profile — RUN, DEBUG, TERMINAL, SEARCH — the same real
              controls the Dashboard and Virtual Keyboard show for VS Code today.
            </p>
            <button
              type="button"
              onClick={() => setPhase('chrome')}
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
            >
              Switch to Chrome
            </button>
          </>
        )}

        {phase === 'chrome' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">
              Chrome is active — the interface changed.
            </p>
            <p className="mb-4 text-sm text-neutral-400">
              Same 4 physical controls, a completely different set of functions: NEW TAB, CLOSE
              WINDOW, RELOAD, FIND. Now let's give Flow a workflow to notice.
            </p>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => void handleSimulateWorkflow()}
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-40"
            >
              {isWorking ? 'Simulating…' : 'Simulate repeated workflow (Copy → Paste)'}
            </button>
            <p className="mt-2 text-[11px] text-neutral-600">
              This inserts backdated workflow metadata through the same pipeline real capture
              uses — not real keystrokes. See the "Why?" panel in the next step for the exact
              numbers.
            </p>
          </>
        )}

        {phase === 'simulating' && (
          <p className="text-sm text-neutral-400">Flow is watching…</p>
        )}

        {phase === 'suggested' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">Flow noticed something.</p>
            {demoSuggestion ? (
              <>
                <p className="mb-3 text-sm text-neutral-400">{demoSuggestion.explanation}</p>
                {demoSuggestion.confidenceBreakdown && (
                  <p className="mb-4 rounded-lg border border-white/5 bg-base-950 px-3 py-2 text-xs leading-relaxed text-neutral-500">
                    {explainConfidence(demoSuggestion.confidenceBreakdown)}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void handleAddToKeyboard()}
                  className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-40"
                >
                  {isWorking ? 'Adding…' : 'Add to Keyboard'}
                </button>
              </>
            ) : (
              <p className="text-sm text-neutral-500">
                No suggestion yet — if you've already run this demo once, press Reset below and
                try again.
              </p>
            )}
          </>
        )}

        {phase === 'accepted' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">
              Control 4 just updated — for real.
            </p>
            <p className="mb-4 text-sm text-neutral-400">
              Chrome's Control 4 is now the Copy → Paste macro, in place of FIND. That's the same
              write path a person accepting a suggestion in the Suggestions panel uses — Flow
              never picks the slot, the user did.
            </p>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] text-neutral-600">
          Resetting restores VS Code/Chrome to their default controls and clears simulated
          workflow data — safe to re-run as many times as you like.
        </p>
        <button
          type="button"
          disabled={isWorking}
          onClick={() => void handleReset()}
          className="shrink-0 text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
        >
          Reset Demo
        </button>
      </div>
    </div>
  )
}
