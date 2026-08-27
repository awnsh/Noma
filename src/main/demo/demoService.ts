import type { Application } from '@shared/types'
import { getDatabase } from '../database/db'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { assignControlAction } from '../database/repositories/controlsRepository'
import { deleteMacro } from '../database/repositories/macrosRepository'
import { insertWorkflowEvent } from '../database/repositories/workflowEventsRepository'
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

export type DemoApplicationId = 'code' | 'chrome'

/** The two seeded applications Demo Mode switches between — chosen because
 *  they already have real, seeded profiles (see database/seed.ts), so the
 *  control changes the demo shows are the product's actual configured
 *  behavior, not demo-only fake data. */
export const DEMO_APPLICATIONS: Record<DemoApplicationId, Application> = {
  code: { id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' },
  chrome: { id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' }
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
