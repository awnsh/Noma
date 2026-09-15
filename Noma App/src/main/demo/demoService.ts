import type { Application } from '@shared/types'
import { getDatabase } from '../database/db'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { deleteMacro } from '../database/repositories/macrosRepository'
import { insertWorkflowEvent } from '../database/repositories/workflowEventsRepository'
import { upsertApplication } from '../database/repositories/applicationsRepository'
import { getSeedDefaultControl } from '../database/seed'

/**
 * Demo Mode — "the Noma Moment" (Product Development Phase 2). A polished,
 * deterministic, repeatable walkthrough of the core adaptive-interface
 * story (contextual controls -> repeated workflow -> explainable
 * suggestion -> one-click control update) for presentations and user
 * testing, without depending on random AI output or the presenter actually
 * Alt-Tabbing between real windows.
 *
 * Deliberately reuses the exact same pipeline real usage does — this file
 * has no code path that bypasses insertWorkflowEvent, pattern detection, or
 * the suggestion engine. The only thing "simulated" is the *origin* of the
 * events (a scripted call instead of a real OS hook or a real Alt-Tab),
 * exactly the same substitution VirtualHardwareDevice already makes for
 * button presses. See docs/architecture.md's "Hardware embedding
 * considerations", item 1.
 */

export type DemoApplicationId = 'code' | 'chrome' | 'claude'

/** The seeded applications Demo Mode switches between. 'code' and 'chrome'
 *  already have real, seeded profiles (see database/seed.ts), so the
 *  control changes the demo shows are the product's actual configured
 *  behavior, not demo-only fake data. 'claude' (Claude Code — the flagship
 *  WORKFLOW LEARNING story's destination app) deliberately has no seeded
 *  profile: the demo never actually switches the *live* context into it
 *  (see simulateDemoMultiStepWorkflow's doc comment), it only appears as an
 *  application id inside the simulated workflow_events, so upsertApplication
 *  is what gives it a real applications row when that's inserted. */
export const DEMO_APPLICATIONS: Record<DemoApplicationId, Application> = {
  code: { id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' },
  chrome: { id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' },
  claude: { id: 'claude', name: 'Claude Code', processName: 'Claude.exe' }
}

const DEMO_WORKFLOW_APPLICATION_ID: DemoApplicationId = 'chrome'

/**
 * How many Copy -> Paste repetitions to simulate, and the timing between
 * them. Tuned to a specific, deliberate outcome, not an arbitrary number:
 *
 * - 4 repetitions of the pair is >= SEQUENCE_THRESHOLD (3), so exactly one
 *   `repeatedSequence` suggestion ("Create a macro for this sequence?")
 *   is generated.
 * - 4 is < REPEATED_SHORTCUT_THRESHOLD (5), so neither Control+C nor
 *   Control+V alone crosses the "assign this shortcut to a control?"
 *   threshold — the demo shows exactly one clean suggestion, not three.
 * - Each Copy/Paste pair is 500ms apart (comfortably inside the 15s
 *   sequence window); each repetition starts 20s after the last (safely
 *   outside that window), so Paste -> next-Copy is never itself counted as
 *   a repeated sequence. All timestamps are backdated from "now" so the
 *   demo never has to actually wait.
 */
const REPEAT_COUNT = 4
const REPEAT_GAP_MS = 20_000
const PASTE_DELAY_MS = 500

/**
 * Inserts a deterministic, backdated Copy -> Paste workflow into
 * workflow_events via the same `insertWorkflowEvent` real capture uses, then
 * leaves pattern detection / suggestion generation to the caller (via
 * whatever already re-runs `SuggestionEngine.refresh()` after a real
 * capture — see main/index.ts's `refreshSuggestions`), so the "Flow
 * noticed something" suggestion that appears is genuinely computed from
 * these rows, not hardcoded copy.
 */
export function simulateDemoWorkflow(): void {
  const now = Date.now()
  const base = now - REPEAT_COUNT * REPEAT_GAP_MS

  for (let i = 0; i < REPEAT_COUNT; i++) {
    const copyAt = base + i * REPEAT_GAP_MS
    const pasteAt = copyAt + PASTE_DELAY_MS
    insertWorkflowEvent({
      applicationId: DEMO_WORKFLOW_APPLICATION_ID,
      eventType: 'shortcut',
      comboKeys: ['Control', 'C'],
      timestamp: copyAt
    })
    insertWorkflowEvent({
      applicationId: DEMO_WORKFLOW_APPLICATION_ID,
      eventType: 'shortcut',
      comboKeys: ['Control', 'V'],
      timestamp: pasteAt
    })
  }
}

/**
 * WORKFLOW LEARNING's flagship demo — "the Noma Moment," v2 (Product
 * Development Phase 3). Inserts a deterministic, backdated repetition of
 * the exact story this feature exists to demonstrate: screenshot -> switch
 * to Claude Code -> paste -> switch back, repeated — tuned to produce
 * exactly one `multiStepWorkflow` suggestion once pattern detection re-runs.
 *
 * Deliberately does NOT call `setDemoApplication('claude')` anywhere: the
 * live "Current Application" context stays on VS Code throughout, matching
 * the real framing this feature is built for — you're working in one app,
 * and Noma notices a workflow that happens *around* it, in the background,
 * without needing you to actually Alt-Tab into Claude Code for the demo to
 * work. `upsertApplication` gives 'claude' a real row so the suggestion's
 * explanation and the eventual macro's `focusApplication` step both resolve
 * a real display name/process, exactly as a genuinely-learned workflow
 * would.
 *
 * Timing mirrors simulateDemoWorkflow's reasoning: REPEAT_COUNT is >=
 * MULTI_STEP_WORKFLOW_THRESHOLD (3) so one suggestion appears, each step
 * within a repetition is well inside WORKFLOW_STEP_WINDOW_MS so the 4 steps
 * chain into one window, and each repetition starts well outside that same
 * window so repetitions never bridge into one one giant (and wrongly
 * longer) chain.
 */
const MULTI_STEP_DEMO_REPEAT_COUNT = 4
const MULTI_STEP_DEMO_REPEAT_GAP_MS = 30_000
const MULTI_STEP_DEMO_STEP_GAP_MS = 2_000

export function simulateDemoMultiStepWorkflow(): void {
  upsertApplication(DEMO_APPLICATIONS.claude)

  const now = Date.now()
  const base = now - MULTI_STEP_DEMO_REPEAT_COUNT * MULTI_STEP_DEMO_REPEAT_GAP_MS

  for (let i = 0; i < MULTI_STEP_DEMO_REPEAT_COUNT; i++) {
    const start = base + i * MULTI_STEP_DEMO_REPEAT_GAP_MS
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.code.id,
      eventType: 'shortcut',
      comboKeys: ['Meta', 'Shift', 'S'], // Windows' own screenshot shortcut
      timestamp: start
    })
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.claude.id,
      eventType: 'appSwitch',
      timestamp: start + MULTI_STEP_DEMO_STEP_GAP_MS
    })
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.claude.id,
      eventType: 'shortcut',
      comboKeys: ['Control', 'V'],
      timestamp: start + 2 * MULTI_STEP_DEMO_STEP_GAP_MS
    })
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.code.id,
      eventType: 'appSwitch',
      timestamp: start + 3 * MULTI_STEP_DEMO_STEP_GAP_MS
    })
  }
}

/**
 * Restores Demo Mode to a clean, replayable state (Phase 21's "demo
 * reset"): clears all workflow events and suggestions, and restores the
 * two demo profiles' controls to their seeded defaults — cleaning up any
 * macro a previous demo run created and assigned in the process. Scoped
 * deliberately to only the demo's own applications; a user's other
 * profiles/macros (from real use, outside Demo Mode) are untouched.
 *
 * This is a development/demo-only operation, exposed only from the Demo
 * page — never offered as a normal end-user action, since it deletes real
 * learning history.
 */
export function resetDemoData(): void {
  const db = getDatabase()
  db.prepare('DELETE FROM workflow_events').run()
  db.prepare('DELETE FROM suggestions').run()

  for (const applicationId of Object.keys(DEMO_APPLICATIONS) as DemoApplicationId[]) {
    const profile = getProfileForApplicationId(applicationId)
    if (!profile) continue

    for (const control of profile.controls) {
      const seedDefault = getSeedDefaultControl(applicationId, control.slot)
      if (!seedDefault) continue

      // A prior demo run may have assigned a macro (from accepting the
      // Copy->Paste suggestion) to this slot — delete it now that nothing
      // will reference it, rather than leaving an orphaned row behind.
      if (control.action.type === 'macro') {
        deleteMacro(control.action.macroId)
      }

      assignControlAction(profile.id, control.slot, seedDefault.label, seedDefault.action)
    }
  }
}
