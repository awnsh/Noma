import { useEffect, useState } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useSuggestionsStore } from '../stores/suggestionsStore'
import { ControlTile } from '../components/ControlTile'
import { NomaMoment } from '../components/NomaMoment'
import { AppIcon } from '../components/AppIcon'
import { GLASS_CARD } from '../lib/surfaces'

/**
 * Demo Mode — "the Noma Moment". A polished, deterministic, repeatable
 * walkthrough of the product story in two acts: (1) an application switch
 * changes the physical controls, and a simple repeated shortcut pair becomes
 * an explainable suggestion — the baseline pattern-detection loop; then (2)
 * WORKFLOW LEARNING, the actual differentiator — a longer, multi-step,
 * cross-app workflow (screenshot -> Claude Code -> paste) gets recognized
 * as one thing, turned into a real action, assigned to a control, and
 * *executed* for real. Built for presentations (Purdue Innovates, investors,
 * user testing), not just internal demoing.
 *
 * Every step drives the real pipeline — the same ApplicationContextService,
 * pattern detection, and suggestion engine any real usage does (see
 * src/main/demo/demoService.ts) — nothing here is a separate, faked path.
 * Because of that, the Dashboard/Virtual Keyboard/Developer pages will
 * honestly reflect whatever step the demo is on if you switch to them
 * mid-demo; click "Exit Demo" when done to hand control back to real
 * application detection.
 */

type DemoPhase =
  | 'intro'
  | 'vscode'
  | 'chrome'
  | 'simulating'
  | 'suggested'
  | 'accepted'
  // WORKFLOW LEARNING — the flagship story: this is the feature the rest of
  // the demo exists to lead into. Continues straight from 'accepted' rather
  // than being a separate page, so the whole thing plays as one walkthrough.
  | 'multiStepIntro'
  | 'multiStepSimulating'
  | 'multiStepSuggested'
  | 'multiStepAccepted'
  | 'multiStepExecuted'

const STEPS: Array<{ phase: DemoPhase; label: string }> = [
  { phase: 'intro', label: 'Start' },
  { phase: 'vscode', label: 'VS Code' },
  { phase: 'chrome', label: 'Switch app' },
  { phase: 'simulating', label: 'Repeat workflow' },
  { phase: 'suggested', label: 'Flow explains' },
  { phase: 'accepted', label: 'Control updates' },
  { phase: 'multiStepIntro', label: 'Learn a workflow' },
  { phase: 'multiStepSimulating', label: 'Repeat it' },
  { phase: 'multiStepSuggested', label: 'Noma notices' },
  { phase: 'multiStepAccepted', label: 'Create action' },
  { phase: 'multiStepExecuted', label: 'Run it' }
]

export function Demo() {
  const { context, refresh: refreshContext, subscribeToContext } = useFlowStore()
  const { suggestions, refresh: refreshSuggestions, subscribe: subscribeSuggestions, resolve } =
    useSuggestionsStore()
  const [phase, setPhase] = useState<DemoPhase>('intro')
  const [isWorking, setIsWorking] = useState(false)
  const [executionResult, setExecutionResult] = useState<{ ok: boolean; reason?: string } | null>(null)

  useEffect(() => {
    refreshContext()
    refreshSuggestions()
    const unsubscribeContext = subscribeToContext()
    const unsubscribeSuggestions = subscribeSuggestions()
    const unsubscribeActionExecuted = window.flow.onActionExecuted((event) =>
      setExecutionResult({ ok: event.ok, reason: event.reason })
    )
    return () => {
      unsubscribeContext()
      unsubscribeSuggestions()
      unsubscribeActionExecuted()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase === 'vscode') void window.flow.setDemoApplication('code')
    if (phase === 'chrome') void window.flow.setDemoApplication('chrome')
    // Deliberately back to 'code', never 'claude' — see
    // simulateDemoMultiStepWorkflow's doc comment for why the live context
    // stays on the app the workflow *starts* in throughout this section.
    if (phase === 'multiStepIntro') void window.flow.setDemoApplication('code')
  }, [phase])

  const demoSuggestion = suggestions.find(
    (suggestion) =>
      suggestion.applicationId === 'chrome' && suggestion.action?.kind === 'createMacroAndAssignToControl'
  )

  const multiStepSuggestion = suggestions.find(
    (suggestion) => suggestion.action?.kind === 'createWorkflowMacroAndAssignToControl'
  )
  // Whichever control the presenter actually assigned the learned action
  // to — NomaMoment's own slot picker decides this for real, never a
  // hardcoded slot the script picks for them (same "you choose, Noma never
  // assigns on its own" rule the real Suggestions panel follows). A fresh
  // demo profile's seeded controls are never a macro, so once one is, it's
  // the one just created.
  const learnedControl = context.profile?.controls.find((control) => control.action.type === 'macro')

  const handleSimulateWorkflow = async (): Promise<void> => {
    setIsWorking(true)
    setPhase('simulating')
    await window.flow.simulateDemoWorkflow()
    await refreshSuggestions()
    setIsWorking(false)
    setPhase('suggested')
  }

  const handleSimulateMultiStepWorkflow = async (): Promise<void> => {
    setIsWorking(true)
    setPhase('multiStepSimulating')
    await window.flow.simulateDemoMultiStepWorkflow()
    await refreshSuggestions()
    setIsWorking(false)
    setPhase('multiStepSuggested')
  }

  const handleRunLearnedAction = async (): Promise<void> => {
    if (!learnedControl) return
    setIsWorking(true)
    setExecutionResult(null)
    setPhase('multiStepExecuted')
    // The real press-a-control path (see FlowApi.pressControl) — this
    // actually sends Meta+Shift+S, tries to focus Claude Code, and sends
    // Control+V then Enter. Not a simulation, so if Claude Code isn't
    // running right now, the focus step honestly fails — see the result
    // panel below.
    await window.flow.pressControl(learnedControl.id)
    setIsWorking(false)
  }

  const handleReset = async (): Promise<void> => {
    setIsWorking(true)
    await window.flow.resetDemoData()
    await window.flow.setDemoApplication(null)
    setExecutionResult(null)
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
          <h1 className="font-display text-xl font-semibold text-neutral-100">Demo</h1>
          <p className="mt-1 text-sm text-neutral-500">
            The Noma Moment — a deterministic, repeatable walkthrough of the core idea. Your
            computer changes. Your interface should too.
          </p>
        </div>
        {phase !== 'intro' && (
          <button
            type="button"
            onClick={() => void handleExit()}
            className="shrink-0 rounded-full border border-base-700 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-100"
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
                index <= currentStepIndex ? 'bg-accent' : 'bg-base-700'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Live device state — the same signal Dashboard/Virtual Keyboard show */}
      <div className={`mb-8 p-6 ${GLASS_CARD}`}>
        <div className="text-xs text-neutral-600">Current application</div>
        <div className="mt-2 flex items-center gap-3">
          {context.application && (
            <AppIcon applicationId={context.application.id} name={context.application.name} size={32} variant="tile" />
          )}
          <div className="text-lg font-medium text-neutral-100">
            {context.application?.name ?? 'None yet — press Start below'}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((slot) => {
            const control = controls.find((c) => c.slot === slot)
            return <ControlTile key={slot} slot={slot} control={control} application={context.application} />
          })}
        </div>
      </div>

      {/* Narration + primary action for the current phase */}
      <div className={`p-6 ${GLASS_CARD}`}>
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
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97]"
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
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97]"
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
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
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
            {demoSuggestion ? (
              <NomaMoment
                suggestion={demoSuggestion}
                variant="hero"
                onReject={(id) => resolve(id, 'rejected')}
                onDismiss={(id) => resolve(id, 'dismissed')}
                onCreated={() => setPhase('accepted')}
              />
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
            <p className="mb-1 text-sm font-medium text-neutral-200">That really updated Chrome's controls.</p>
            <p className="mb-4 text-sm text-neutral-400">
              Whichever control you just picked is the real Copy → Paste macro now — the same write
              path a person accepting a suggestion in the Suggestions panel uses. Noma never picks
              the slot; you did.
            </p>
            <button
              type="button"
              onClick={() => setPhase('multiStepIntro')}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 active:opacity-80"
            >
              Continue — the bigger idea
            </button>
          </>
        )}

        {phase === 'multiStepIntro' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">
              That was one shortcut noticing another. This is Noma's real differentiator.
            </p>
            <p className="mb-4 text-sm text-neutral-400">
              A Stream Deck or a macro pad can run a shortcut you configured by hand. Noma learns
              workflows you never configured at all — even multi-step ones that cross applications,
              even when they don't happen exactly the same way twice. Watch: you're back in VS
              Code. You take a screenshot, switch to Claude Code, paste it, and switch back — and
              you do that a few times while you're debugging.
            </p>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => void handleSimulateMultiStepWorkflow()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 active:opacity-80 disabled:opacity-40"
            >
              {isWorking
                ? 'Simulating…'
                : 'Simulate repeated workflow (Screenshot → Claude Code → Paste)'}
            </button>
            <p className="mt-2 text-[11px] text-neutral-600">
              Same as before — backdated workflow metadata through the real capture pipeline, not
              real keystrokes. Noma never records the screenshot's contents or what you typed into
              Claude Code, only that these steps happened, in this order, repeatedly.
            </p>
          </>
        )}

        {phase === 'multiStepSimulating' && (
          <p className="text-sm text-neutral-400">Noma is watching…</p>
        )}

        {phase === 'multiStepSuggested' && (
          <>
            {multiStepSuggestion ? (
              <NomaMoment
                suggestion={multiStepSuggestion}
                variant="hero"
                onReject={(id) => resolve(id, 'rejected')}
                onDismiss={(id) => resolve(id, 'dismissed')}
                onCreated={() => setPhase('multiStepAccepted')}
              />
            ) : (
              <p className="text-sm text-neutral-500">
                No suggestion yet — if you've already run this demo once, press Reset below and
                try again.
              </p>
            )}
          </>
        )}

        {phase === 'multiStepAccepted' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">
              {learnedControl?.label ?? 'A control'} just became a real, learned action.
            </p>
            <p className="mb-4 text-sm text-neutral-400">
              Whichever control you just picked is now the whole workflow: screenshot, switch to
              Claude Code, paste, submit — one press instead of four separate steps, on a control
              that exists because Noma learned you actually do this.
            </p>
            <button
              type="button"
              disabled={isWorking || !learnedControl}
              onClick={() => void handleRunLearnedAction()}
              className="rounded-md border border-accent-muted bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
            >
              Run it
            </button>
          </>
        )}

        {phase === 'multiStepExecuted' && (
          <>
            <p className="mb-1 text-sm font-medium text-neutral-200">
              {isWorking ? 'Running the learned action…' : 'That really ran.'}
            </p>
            <p className="mb-4 text-sm text-neutral-400">
              Pressing this control actually sent the screenshot shortcut, tried to focus Claude
              Code, and sent Paste then Enter — the same real execution path (actionExecutor.ts)
              any control uses, no separate demo-only path.
            </p>
            {!isWorking && executionResult && (
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  executionResult.ok
                    ? 'border-accent-muted text-accent'
                    : 'border-base-700 text-neutral-600'
                }`}
              >
                {executionResult.ok
                  ? '✓ Executed the full workflow.'
                  : `Focus step stopped here: ${executionResult.reason ?? 'unknown reason'}. That's expected if Claude Code isn't actually running on this machine — Noma only focuses a real, already-running window, it never launches one.`}
              </div>
            )}
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
