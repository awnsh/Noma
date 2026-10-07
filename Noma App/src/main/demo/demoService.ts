import type { Application, Suggestion } from '@shared/types'
import { DEMO_MACRO_TRIGGER } from '@shared/constants'
import { getDatabase } from '../database/db'
import { getAllMacros } from '../database/repositories/macrosRepository'
import { insertWorkflowEvent } from '../database/repositories/workflowEventsRepository'
import { upsertApplication } from '../database/repositories/applicationsRepository'
import { getPendingSuggestions, markSuggestionsDemo } from '../database/repositories/suggestionsRepository'
import { removeLearnedWorkflow } from '../applications/workflowRemoval'

/**
 * Demo Mode: "the Noma Moment" (Product Development Phase 2). A polished,
 * deterministic, repeatable walkthrough of the core adaptive-interface
 * story (contextual controls -> repeated workflow -> explainable
 * suggestion -> one-click control update) for presentations and user
 * testing, without depending on random AI output or the presenter actually
 * Alt-Tabbing between real windows.
 *
 * Deliberately reuses the exact same pipeline real usage does: this file
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
 *  behavior, not demo-only fake data. 'claude' (Claude Code: the flagship
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
 * How many Bookmark -> Close tab repetitions to simulate (save a page for
 * later, then close it: a real two-step tab-triage habit; Copy -> Paste was
 * used before, but in one app that's not something a press can usefully
 * replay, and workflowSense.ts now refuses to suggest it), and the timing between
 * them. Tuned to a specific, deliberate outcome, not an arbitrary number:
 *
 * - 4 repetitions of the pair is >= SEQUENCE_THRESHOLD (3), so exactly one
 *   `repeatedSequence` suggestion ("Create a macro for this sequence?")
 *   is generated.
 * - 4 is < REPEATED_SHORTCUT_THRESHOLD (5), so neither Control+D nor
 *   Control+W alone crosses the "assign this shortcut to a control?"
 *   threshold: the demo shows exactly one clean suggestion, not three.
 * - Each Bookmark/Close pair is 500ms apart (comfortably inside the 15s
 *   sequence window); each repetition starts 20s after the last (safely
 *   outside that window), so Close -> next-Bookmark is never itself counted as
 *   a repeated sequence. All timestamps are backdated from "now" so the
 *   demo never has to actually wait.
 */
const REPEAT_COUNT = 4
const REPEAT_GAP_MS = 20_000
const CLOSE_DELAY_MS = 500

/**
 * Inserts a deterministic, backdated Bookmark -> Close tab workflow into
 * workflow_events via the same `insertWorkflowEvent` real capture uses, then
 * leaves pattern detection / suggestion generation to the caller (via
 * whatever already re-runs `SuggestionEngine.refresh()` after a real
 * capture: see main/index.ts's `refreshSuggestions`), so the "Flow
 * noticed something" suggestion that appears is genuinely computed from
 * these rows, not hardcoded copy.
 */
export function simulateDemoWorkflow(): void {
  const now = Date.now()
  const base = now - REPEAT_COUNT * REPEAT_GAP_MS

  for (let i = 0; i < REPEAT_COUNT; i++) {
    const bookmarkAt = base + i * REPEAT_GAP_MS
    const closeAt = bookmarkAt + CLOSE_DELAY_MS
    insertWorkflowEvent({
      applicationId: DEMO_WORKFLOW_APPLICATION_ID,
      eventType: 'shortcut',
      comboKeys: ['Control', 'D'],
      timestamp: bookmarkAt,
      isDemo: true
    })
    insertWorkflowEvent({
      applicationId: DEMO_WORKFLOW_APPLICATION_ID,
      eventType: 'shortcut',
      comboKeys: ['Control', 'W'],
      timestamp: closeAt,
      isDemo: true
    })
  }
}

/**
 * WORKFLOW LEARNING's flagship demo: "the Noma Moment," v2 (Product
 * Development Phase 3). Inserts a deterministic, backdated repetition of
 * the exact story this feature exists to demonstrate: screenshot -> switch
 * to Claude Code -> paste -> switch back, repeated; tuned to produce
 * exactly one `multiStepWorkflow` suggestion once pattern detection re-runs.
 *
 * Deliberately does NOT call `setDemoApplication('claude')` anywhere: the
 * live "Current Application" context stays on VS Code throughout, matching
 * the real framing this feature is built for; you're working in one app,
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
      timestamp: start,
      isDemo: true
    })
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.claude.id,
      eventType: 'appSwitch',
      timestamp: start + MULTI_STEP_DEMO_STEP_GAP_MS,
      isDemo: true
    })
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.claude.id,
      eventType: 'shortcut',
      comboKeys: ['Control', 'V'],
      timestamp: start + 2 * MULTI_STEP_DEMO_STEP_GAP_MS,
      isDemo: true
    })
    insertWorkflowEvent({
      applicationId: DEMO_APPLICATIONS.code.id,
      eventType: 'appSwitch',
      timestamp: start + 3 * MULTI_STEP_DEMO_STEP_GAP_MS,
      isDemo: true
    })
  }
}

/** Which combos and apps each scripted demo workflow is made of. A pending
 *  suggestion built only from these, right after a demo run, is the demo's. */
const DEMO_SIGNATURES: Array<{ combos: string[]; applicationIds: string[] }> = [
  { combos: ['Control+D', 'Control+W'], applicationIds: [DEMO_WORKFLOW_APPLICATION_ID] },
  { combos: ['Meta+Shift+S', 'Control+V'], applicationIds: [DEMO_APPLICATIONS.code.id, DEMO_APPLICATIONS.claude.id] }
]

/** The combos and applications a suggestion's action is made of. */
function suggestionShape(suggestion: Suggestion): { combos: string[]; applicationIds: string[] } {
  const action = suggestion.action
  const applicationIds = new Set<string>(suggestion.applicationId ? [suggestion.applicationId] : [])
  const combos: string[] = []
  if (action?.kind === 'assignShortcutToControl') combos.push(action.comboKeys.join('+'))
  if (action?.kind === 'createMacroAndAssignToControl') combos.push(...action.sequence)
  if (action?.kind === 'createWorkflowMacroAndAssignToControl') {
    for (const step of action.steps) {
      if (step.type === 'shortcut') combos.push(step.comboKeys.join('+'))
      if (step.applicationId) applicationIds.add(step.applicationId)
    }
  }
  return { combos, applicationIds: [...applicationIds] }
}

/** True when a suggestion is made only of one demo workflow's pieces. */
export function looksLikeDemoSuggestion(suggestion: Suggestion): boolean {
  const shape = suggestionShape(suggestion)
  if (shape.combos.length === 0) return false
  return DEMO_SIGNATURES.some(
    (signature) =>
      shape.combos.every((combo) => signature.combos.includes(combo)) &&
      shape.applicationIds.every((id) => signature.applicationIds.includes(id))
  )
}

/**
 * Called right after a demo run has been through detection: flags the
 * pending suggestions it produced, so they show as a demo and the reset can
 * find them. Matching is by shape because detection doesn't carry where its
 * events came from; it only runs straight after a demo, so a real habit is
 * flagged only if it is the identical workflow seen in the same moment.
 */
export function markDemoSuggestions(): void {
  markSuggestionsDemo(getPendingSuggestions().filter(looksLikeDemoSuggestion).map((suggestion) => suggestion.id))
}

/**
 * Restores Demo Mode to a clean, replayable state: removes the demo's own
 * scripted events, the suggestions they produced, and any workflow saved
 * from one of those suggestions (its control goes back to its starter
 * action). Nothing real is touched: events Noma observed, suggestions it
 * made from them, and workflows the user saved all stay.
 */
export function resetDemoData(): void {
  const db = getDatabase()
  db.prepare('DELETE FROM workflow_events WHERE is_demo = 1').run()
  db.prepare('DELETE FROM suggestions WHERE is_demo = 1').run()
  for (const macro of getAllMacros()) {
    if (macro.trigger === DEMO_MACRO_TRIGGER) removeLearnedWorkflow(macro.id)
  }
}
