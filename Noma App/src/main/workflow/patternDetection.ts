import type { DetectedPattern, WorkflowEvent, WorkflowStep } from '@shared/types'
import { inAppLabel } from './appKnowledge'
import { describeClickTarget } from './clickTarget'
import { chainMakesSense, isIgnoredApp, isNoiseShortcut, isTrivialShortcut, shortcutRole } from './workflowSense'

/**
 * Deterministic/statistical pattern detection (brainstorm.md sections
 * 11-12); explicitly NOT an LLM. Pure functions over already-captured,
 * already-sanitized WorkflowEvent metadata, so this is trivially unit
 * testable with synthetic events and never touches the database itself.
 *
 * Covers 3 of the 5 categories section 11 lists: repeated shortcuts,
 * repeated sequences, and frequently used controls. "Underused controls"
 * and "application-specific behavior" are deliberately deferred; both
 * need more context (the full set of configured controls, and a richer
 * per-application baseline) than is worth building before there's a
 * suggestion engine (Phase 5) to act on it.
 *
 * A fourth capability, `detectCrossAppWorkflows`, was added later: the
 * three detectors above only ever look *within* one application (every
 * group key is scoped `applicationId::...`), so a workflow that spans
 * multiple apps; take a screenshot, switch to an editor, paste, repeat,
 * eventually commit; never showed up as anything more than isolated
 * per-app noise. It reads the same already-captured WorkflowEvent stream,
 * including 'appSwitch' events (see shared/types) alongside shortcuts,
 * so Flow can recognize the shape of a workflow across platforms, not only
 * the individual keystrokes within one.
 *
 * A fifth capability, `detectMultiStepWorkflows`. WORKFLOW LEARNING, Noma's
 * core differentiator (see docs/product-audit.md); generalizes
 * `detectCrossAppWorkflows` from a fixed 2-step pair to an arbitrary-length
 * (3-6 step) chain, matched *approximately* rather than exactly: two
 * occurrences count as "the same workflow" even if one has an extra step in
 * the middle that the other doesn't (captureFilter.ts never records raw
 * typed content, so a real repeat that differs only by what the user typed
 * looks, to this detector, like an occasional extra/missing step around the
 * same anchors). This is what turns "screenshot -> switch to Claude Code ->
 * paste -> switch back," repeated, into one recognized, nameable workflow
 * instead of three separate two-step coincidences.
 */

// Exported so the suggestion engine's confidence math (src/main/ai/
// suggestionRules.ts) stays in sync with "how far past threshold" actually
// means, instead of duplicating these numbers in a second file.
export const REPEATED_SHORTCUT_THRESHOLD = 5
export const FREQUENT_CONTROL_THRESHOLD = 5
export const SEQUENCE_THRESHOLD = 3
/** Two shortcuts count as "in sequence" only if they happen within this window. */
const SEQUENCE_WINDOW_MS = 15_000

/**
 * Spam guard: two genuinely separate, deliberate uses of the same shortcut
 * or control are realistically never closer together than this: a real
 * press-release-press-again takes at least a brief moment. Anything faster
 * is either the OS's own key-repeat while a key is held down (as fast as
 * ~30ms between repeats) or someone mashing a button in a quick burst
 * (testing it, venting, curious what it does); neither is a distinct
 * repeated *workflow*, which is what these patterns are meant to catch.
 * Without this, 5 presses in the same half-second would look identical to
 * a suggestion engine as 5 uses genuinely spread across a real work
 * session, and Flow would offer to dedicate a control to something that
 * was never actually repeated on purpose. Picked well above key-repeat's
 * fastest rate and well below the gap between any two legitimately
 * separate real uses.
 */
const MIN_REPEAT_GAP_MS = 400

export const CROSS_APP_WORKFLOW_THRESHOLD = 3
/**
 * How far apart two steps (an app switch or a shortcut) can be while still
 * counting as one continuous cross-app move; wider than SEQUENCE_WINDOW_MS
 * on purpose. A cross-app hop (alt-tabbing to paste into another window,
 * waiting a moment for it to focus) naturally takes longer than two
 * shortcuts pressed back-to-back inside one app.
 */
const WORKFLOW_STEP_WINDOW_MS = 20_000
/**
 * How soon after a workflow pair's last completed round a following step
 * still counts as "what this workflow leads to"; e.g. switching to a git
 * client right after several rounds of pasting into an editor; rather than
 * an unrelated later action picked up by coincidence.
 */
const CLOSING_STEP_WINDOW_MS = 30_000
/** A closing step needs to follow the pattern's own repeat-runs at least
 *  this many separate times before it's reported; one coincidence isn't a
 *  pattern. */
const CLOSING_STEP_MIN_RUNS = 2

/**
 * Collapses a burst of same-key timestamps down to how many *count* as
 * separate, deliberate occurrences: keeps the first, then skips every
 * later one that lands within MIN_REPEAT_GAP_MS of the last one actually
 * counted. A real, spread-out repeated workflow passes through untouched
 * (every real gap is already well above the floor); a spam burst collapses
 * toward a single occurrence, so it can't rack up a threshold on its own
 * this is the one mechanism behind every "spam vs. workflow" case below,
 * applied per pattern kind at its own natural occurrence marker (a
 * shortcut/control's own timestamp, or a sequence pair's completion time).
 */
function countSpacedOccurrences(timestamps: number[]): number {
  const sorted = [...timestamps].sort((a, b) => a - b)
  let count = 0
  let lastCounted = -Infinity
  for (const timestamp of sorted) {
    if (timestamp - lastCounted >= MIN_REPEAT_GAP_MS) {
      count += 1
      lastCounted = timestamp
    }
  }
  return count
}

/** Two counted occurrences further apart than this belong to different
 *  "sittings": see DetectedPatternBase.sessionCount. */
const SESSION_GAP_MS = 5 * 60_000

/** Number of separate sittings the given occurrence timestamps fall into. */
function countSessions(timestamps: number[]): number {
  if (timestamps.length === 0) return 0
  const sorted = [...timestamps].sort((a, b) => a - b)
  let sessions = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > SESSION_GAP_MS) sessions += 1
  }
  return sessions
}

/** An Undo this soon after an action, in the same app, takes it back. */
const UNDO_WINDOW_MS = 10_000

/**
 * The events with everything that isn't part of what the user meant to do
 * taken out (see workflowSense.ts): getting-around shortcuts (Alt+Tab,
 * Ctrl+Arrow, Ctrl+Backspace), system windows, and corrections. An Undo
 * removes itself *and* the action it took back, so "Paste → Undo → Paste as
 * plain text" is "Paste as plain text", which is what was meant.
 * Idempotent, so every detector can safely start from it.
 */
function withoutNoise(events: WorkflowEvent[]): WorkflowEvent[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const kept: WorkflowEvent[] = []
  for (const event of sorted) {
    if (event.eventType !== 'controlActivation' && isIgnoredApp(event.applicationId)) continue
    if (event.eventType === 'shortcut' && event.comboKeys) {
      const role = shortcutRole(event.comboKeys)
      if (role === 'undo') {
        const last = kept[kept.length - 1]
        if (
          last &&
          (last.eventType === 'shortcut' || last.eventType === 'click') &&
          last.applicationId === event.applicationId &&
          event.timestamp - last.timestamp <= UNDO_WINDOW_MS
        ) {
          kept.pop()
        }
        continue
      }
      if (isNoiseShortcut(event.comboKeys)) continue
    }
    kept.push(event)
  }
  return kept
}

export function detectPatterns(rawEvents: WorkflowEvent[]): DetectedPattern[] {
  const events = withoutNoise(rawEvents)
  const longMultiStepWorkflows = detectMultiStepWorkflows(events)
  // An in-app click pair (Cut -> Delete) is the 2-step case of the same
  // shape; it's dropped in favor of any longer chain that already contains it.
  const clickPairs = detectInAppClickPairs(events).filter(
    (pair) => !isSubsumedByMultiStepWorkflow(pair, longMultiStepWorkflows)
  )
  const multiStepWorkflows = [...longMultiStepWorkflows, ...clickPairs]
  const crossAppWorkflows = detectCrossAppWorkflows(events).filter(
    (pattern) => !isSubsumedByMultiStepWorkflow(pattern, multiStepWorkflows)
  )

  return [
    ...detectRepeatedShortcuts(events),
    ...detectFrequentControls(events),
    ...detectRepeatedSequences(events),
    ...crossAppWorkflows,
    ...multiStepWorkflows
  ]
}

/**
 * A `crossAppWorkflow` pair is exactly the shape `detectMultiStepWorkflows`
 * generalizes; so whenever a richer, already-threshold-passing multi-step
 * chain fully contains a 2-step pair (as a contiguous run of the same step
 * signatures), the pair is the same underlying behavior seen through a
 * narrower lens, not a second, independent thing the user did. Reported on
 * its own it would be redundant noise next to the fuller suggestion
 * (STEP 4: fewer, higher-quality suggestions); so it's dropped here, in
 * favor of the multi-step suggestion, rather than shown twice.
 */
function isSubsumedByMultiStepWorkflow(pair: DetectedPattern, multiStepWorkflows: DetectedPattern[]): boolean {
  if (pair.kind !== 'crossAppWorkflow' && pair.kind !== 'multiStepWorkflow') return false
  const pairSignature = pair.steps.map(stepSignature)
  return multiStepWorkflows.some((workflow) => {
    if (workflow.kind !== 'multiStepWorkflow' || workflow.steps.length <= pair.steps.length) return false
    const workflowSignatures = workflow.steps.map(stepSignature)
    // Contained in order, or made of the workflow's own steps out of order:
    // the last step of one round followed by the first of the next ("Copy →
    // Edit" around "Edit → Select all → Copy") is the same loop, not a second
    // workflow.
    return (
      isContiguousSubarray(pairSignature, workflowSignatures) ||
      pairSignature.every((signature) => workflowSignatures.includes(signature))
    )
  })
}

/** Whether every element of `needle`, in order, appears as a contiguous run
 *  somewhere inside `haystack`. Pure array containment; used both to drop
 *  a `crossAppWorkflow` pair already covered by a fuller multi-step chain
 *  (above) and, inside `detectMultiStepWorkflows` itself, to drop a shorter
 *  chain that's already covered by a longer one. */
function isContiguousSubarray(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (needle.every((value, offset) => haystack[start + offset] === value)) return true
  }
  return false
}

function detectRepeatedShortcuts(events: WorkflowEvent[]): DetectedPattern[] {
  const groups = new Map<
    string,
    { applicationId: string | null; comboKeys: string[]; timestamps: number[] }
  >()

  for (const event of events) {
    if (event.eventType !== 'shortcut' || !event.comboKeys) continue
    if (isTrivialShortcut(event.comboKeys)) continue
    const key = `${event.applicationId ?? 'unknown'}::${event.comboKeys.join('+')}`
    const existing = groups.get(key)
    if (existing) {
      existing.timestamps.push(event.timestamp)
    } else {
      groups.set(key, {
        applicationId: event.applicationId,
        comboKeys: event.comboKeys,
        timestamps: [event.timestamp]
      })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, value] of groups) {
    const count = countSpacedOccurrences(value.timestamps)
    if (count < REPEATED_SHORTCUT_THRESHOLD) continue
    patterns.push({
      id: `shortcut:${key}`,
      kind: 'repeatedShortcut',
      applicationId: value.applicationId,
      description: `${value.comboKeys.join('+')} used ${count} times`,
      count,
      sessionCount: countSessions(value.timestamps),
      comboKeys: value.comboKeys
    })
  }
  return patterns
}

function detectFrequentControls(events: WorkflowEvent[]): DetectedPattern[] {
  const groups = new Map<
    string,
    { applicationId: string | null; controlId: string; timestamps: number[] }
  >()

  for (const event of events) {
    if (event.eventType !== 'controlActivation' || !event.controlId) continue
    const key = `${event.applicationId ?? 'unknown'}::${event.controlId}`
    const existing = groups.get(key)
    if (existing) {
      existing.timestamps.push(event.timestamp)
    } else {
      groups.set(key, {
        applicationId: event.applicationId,
        controlId: event.controlId,
        timestamps: [event.timestamp]
      })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, value] of groups) {
    const count = countSpacedOccurrences(value.timestamps)
    if (count < FREQUENT_CONTROL_THRESHOLD) continue
    patterns.push({
      id: `control:${key}`,
      kind: 'frequentControl',
      applicationId: value.applicationId,
      description: `Control "${value.controlId}" activated ${count} times`,
      count,
      sessionCount: countSessions(value.timestamps),
      controlId: value.controlId
    })
  }
  return patterns
}

function detectRepeatedSequences(events: WorkflowEvent[]): DetectedPattern[] {
  const shortcutEvents = events
    .filter((event) => event.eventType === 'shortcut' && !!event.comboKeys)
    .sort((a, b) => a.timestamp - b.timestamp)

  const groups = new Map<
    string,
    { applicationId: string | null; sequence: string[]; timestamps: number[] }
  >()

  for (let i = 0; i < shortcutEvents.length - 1; i++) {
    const first = shortcutEvents[i]
    const second = shortcutEvents[i + 1]
    if (!first.comboKeys || !second.comboKeys) continue
    if (second.timestamp - first.timestamp > SEQUENCE_WINDOW_MS) continue
    if (first.applicationId !== second.applicationId) continue
    // A "sequence" means two *different* steps done together repeatedly
    // (Copy -> Paste). The same shortcut pressed back-to-back several times
    // (e.g. Ctrl+T x5, typed fast) is not a sequence; it's // detectRepeatedShortcuts' job, and double-counting it here used to
    // produce a nonsensical "Ctrl+T -> Ctrl+T" two-step macro suggestion.
    if (first.comboKeys.join('+') === second.comboKeys.join('+')) continue
    if (
      !chainMakesSense([
        { type: 'shortcut', applicationId: first.applicationId, comboKeys: first.comboKeys },
        { type: 'shortcut', applicationId: second.applicationId, comboKeys: second.comboKeys }
      ])
    ) {
      continue
    }

    const sequence = [first.comboKeys.join('+'), second.comboKeys.join('+')]
    const key = `${first.applicationId ?? 'unknown'}::${sequence.join('->')}`
    // The pair's completion time (when the second step actually happened)
    // is this occurrence's marker for the same spam guard used above
    // rapidly alternating Copy/Paste/Copy/Paste in a quick burst (someone
    // testing or mashing, not doing real work) collapses toward one
    // occurrence instead of racking up SEQUENCE_THRESHOLD on its own.
    const existing = groups.get(key)
    if (existing) {
      existing.timestamps.push(second.timestamp)
    } else {
      groups.set(key, { applicationId: first.applicationId, sequence, timestamps: [second.timestamp] })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, value] of groups) {
    const count = countSpacedOccurrences(value.timestamps)
    if (count < SEQUENCE_THRESHOLD) continue
    patterns.push({
      id: `sequence:${key}`,
      kind: 'repeatedSequence',
      applicationId: value.applicationId,
      description: `${value.sequence.join(' → ')} repeated ${count} times`,
      count,
      sessionCount: countSessions(value.timestamps),
      sequence: value.sequence
    })
  }
  return patterns
}

interface WorkflowStepEvent {
  step: WorkflowStep
  timestamp: number
}

/** A short, stable, human-readable label for one step; used both for
 *  descriptions and as the per-step piece of a group's signature key. */
export function stepSignature(step: WorkflowStep): string {
  switch (step.type) {
    case 'appSwitch':
      return `app:${step.applicationId ?? 'unknown'}`
    case 'click':
      return `click:${step.applicationId ?? 'unknown'}:${step.target}`
    case 'shortcut':
      return `key:${step.applicationId ?? 'unknown'}:${step.comboKeys.join('+')}`
  }
}

/**
 * A handful of shortcuts are meaningful enough, on sight, that showing the
 * raw combo instead of what it *does* would undersell what Flow noticed
 * "Screenshot -> Claude Code -> Paste" reads as a real workflow; "Meta+
 * Shift+S -> Claude Code -> Control+V" reads as a debug log. Deliberately
 * small and Windows-specific (the same closed-vocabulary spirit as
 * keyNames.ts): only combos common enough to name confidently, everything
 * else still falls back to the raw combo, never a guess.
 */
const SHORTCUT_DISPLAY_LABELS: Record<string, string> = {
  'Meta+Shift+S': 'Screenshot',
  'Control+V': 'Paste',
  'Control+C': 'Copy',
  'Control+X': 'Cut'
}

/** e.g. ['Control', 'V'] -> "Paste", ['Control', 'K'] -> "Control+K". When
 *  the application is known, an app-specific name wins ("Blade" for Ctrl+B
 *  in DaVinci Resolve): see appKnowledge.ts. */
export function shortcutDisplayLabel(comboKeys: string[], applicationId: string | null = null): string {
  const combo = comboKeys.join('+')
  return inAppLabel(applicationId, comboKeys) ?? SHORTCUT_DISPLAY_LABELS[combo] ?? combo
}

export function describeStep(step: WorkflowStep): string {
  switch (step.type) {
    case 'appSwitch':
      return step.applicationId ?? 'another app'
    case 'click':
      return `Click ${describeClickTarget(step.target)}`
    case 'shortcut':
      return shortcutDisplayLabel(step.comboKeys, step.applicationId)
  }
}

/**
 * Rebuilds the chronological "what did the user do" stream that
 * detectCrossAppWorkflows reasons over: appSwitch and shortcut events
 * interleaved in the order they actually happened, controlActivation
 * excluded (a physical control press on Noma's own hardware isn't "moving
 * between platforms"). Two appSwitch rows landing on the same application
 * back-to-back collapse into one: a real hop always moves to a
 * *different* app, so a stray duplicate (e.g. a context refresh that isn't
 * a genuine switch) shouldn't count as a second one.
 */
function buildWorkflowSteps(events: WorkflowEvent[]): WorkflowStepEvent[] {
  // Ambient apps (a music player) and system windows are dropped entirely
  // (withoutNoise): glancing at Spotify between two real steps isn't part of
  // the workflow, so Editor → Spotify → Terminal is the same Editor →
  // Terminal workflow as without the detour.
  const relevant = withoutNoise(events).filter(
    (event) => event.eventType === 'shortcut' || event.eventType === 'appSwitch' || event.eventType === 'click'
  )

  const steps: WorkflowStepEvent[] = []
  relevant.forEach((event, index) => {
    if (event.eventType === 'appSwitch') {
      // A pass-through: the app was in front for a moment on the way
      // somewhere else, with nothing done in it. Clicking a taskbar button
      // puts Windows Explorer (which owns the taskbar) in front for ~0.4 s,
      // and Alt-Tab flicks through windows the same way; in real data 562
      // switches into Explorer lasted under a second. Kept as steps, they
      // turned every "go to Chrome" into "Explorer -> Chrome" and produced
      // workflows nobody did.
      const next = relevant[index + 1]
      if (
        next?.eventType === 'appSwitch' &&
        next.applicationId !== event.applicationId &&
        next.timestamp - event.timestamp < PASS_THROUGH_MS
      ) {
        return
      }
      const last = steps[steps.length - 1]
      if (last?.step.type === 'appSwitch' && last.step.applicationId === event.applicationId) return
      steps.push({ timestamp: event.timestamp, step: { type: 'appSwitch', applicationId: event.applicationId } })
    } else if (event.eventType === 'click') {
      if (event.clickTarget) {
        steps.push({
          timestamp: event.timestamp,
          step: { type: 'click', applicationId: event.applicationId, target: event.clickTarget }
        })
      }
    } else if (event.comboKeys) {
      steps.push({
        timestamp: event.timestamp,
        step: { type: 'shortcut', applicationId: event.applicationId, comboKeys: event.comboKeys }
      })
    }
  })
  return steps
}

/** An app left again within this long, with nothing done in it, was only
 *  passed through (see buildWorkflowSteps). */
const PASS_THROUGH_MS = 800

interface WorkflowOccurrence {
  /** Index of the pair's first step in the full `steps` array; kept
   *  (rather than the timestamp) so findClosingStep can look up
   *  exactly what happened right after this specific occurrence. */
  index: number
  timestamp: number
}

/**
 * Recognizes short (two-step) chains that involve moving between
 * applications: the app-switch-aware sibling of detectRepeatedSequences,
 * which only ever looks at two shortcuts inside one app. A pair here always
 * includes at least one 'appSwitch' step; a same-app pair of two shortcuts
 * stays exclusively detectRepeatedSequences' territory, so the two
 * detectors never double-report the same underlying behavior.
 *
 * This is deliberately not an executable macro suggestion the way
 * repeatedSequence is; there's no "switch to this app" step in the macro
 * vocabulary (see actionExecutor.ts; launchApplication is disabled on
 * purpose); so suggestionRules.ts treats this as informational: naming the
 * real workflow Flow noticed, not offering to automate half of it.
 */
function detectCrossAppWorkflows(events: WorkflowEvent[]): DetectedPattern[] {
  const steps = buildWorkflowSteps(events)

  const groups = new Map<
    string,
    { steps: [WorkflowStep, WorkflowStep]; applicationIds: Array<string | null>; occurrences: WorkflowOccurrence[] }
  >()

  for (let i = 0; i < steps.length - 1; i++) {
    const first = steps[i]
    const second = steps[i + 1]
    if (second.timestamp - first.timestamp > WORKFLOW_STEP_WINDOW_MS) continue
    if (first.step.type !== 'appSwitch' && second.step.type !== 'appSwitch') continue
    if (!chainMakesSense([first.step, second.step])) continue

    const signature = `${stepSignature(first.step)}->${stepSignature(second.step)}`
    const existing = groups.get(signature)
    const occurrence: WorkflowOccurrence = { index: i, timestamp: second.timestamp }
    if (existing) {
      existing.occurrences.push(occurrence)
    } else {
      const applicationIds = [...new Set([first.step.applicationId, second.step.applicationId])]
      groups.set(signature, { steps: [first.step, second.step], applicationIds, occurrences: [occurrence] })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [signature, group] of groups) {
    const count = countSpacedOccurrences(group.occurrences.map((occurrence) => occurrence.timestamp))
    if (count < CROSS_APP_WORKFLOW_THRESHOLD) continue

    const closingStep = findClosingStep(group.occurrences, steps)
    const chain = group.steps.map(describeStep).join(' → ')
    const description = closingStep
      ? `${chain} repeated ${count} times, usually followed by ${describeStep(closingStep)}`
      : `${chain} repeated ${count} times`

    // The real gap this pair took, each time it happened; median rather
    // than the latest or first, so one unusually slow or fast repeat (user
    // got distracted mid-workflow once) doesn't set the replay pace.
    const gaps = group.occurrences
      .map((occurrence) => occurrence.timestamp - steps[occurrence.index].timestamp)
      .sort((a, b) => a - b)
    const medianGapMs = Math.min(WORKFLOW_STEP_WINDOW_MS, Math.max(0, gaps[Math.floor(gaps.length / 2)]))

    patterns.push({
      id: `workflow:${signature}`,
      kind: 'crossAppWorkflow',
      applicationId: group.applicationIds[group.applicationIds.length - 1],
      applicationIds: group.applicationIds,
      steps: group.steps,
      description,
      count,
      sessionCount: countSessions(group.occurrences.map((occurrence) => occurrence.timestamp)),
      stepDelaysMs: [0, medianGapMs],
      ...(closingStep ? { closingStep } : {})
    })
  }
  return patterns
}

/**
 * What, if anything, consistently happens right after this chain finishes a
 * "run"; one or more back-to-back repeats with no real break in between.
 * Only the last occurrence of each run is a candidate point (an occurrence
 * still mid-loop would see the next repeat starting, not the
 * workflow's actual conclusion), and a candidate needs to show up after at
 * least CLOSING_STEP_MIN_RUNS separate runs before it's reported; one
 * coincidence isn't a pattern.
 */
function findClosingStep(occurrences: WorkflowOccurrence[], steps: WorkflowStepEvent[]): WorkflowStep | undefined {
  const sorted = [...occurrences].sort((a, b) => a.timestamp - b.timestamp)

  const runEnds: WorkflowOccurrence[] = []
  let previous: WorkflowOccurrence | null = null
  for (const occurrence of sorted) {
    if (previous && occurrence.timestamp - previous.timestamp > WORKFLOW_STEP_WINDOW_MS) {
      runEnds.push(previous)
    }
    previous = occurrence
  }
  if (previous) runEnds.push(previous)

  const candidates = new Map<string, { step: WorkflowStep; count: number }>()
  for (const runEnd of runEnds) {
    const next = steps[runEnd.index + 2]
    if (!next || next.timestamp - runEnd.timestamp > CLOSING_STEP_WINDOW_MS) continue
    const key = stepSignature(next.step)
    const bucket = candidates.get(key)
    if (bucket) bucket.count += 1
    else candidates.set(key, { step: next.step, count: 1 })
  }

  let best: { step: WorkflowStep; count: number } | undefined
  for (const candidate of candidates.values()) {
    if (!best || candidate.count > best.count) best = candidate
  }
  return best && best.count >= CLOSING_STEP_MIN_RUNS ? best.step : undefined
}

export const IN_APP_CLICK_THRESHOLD = 3

/**
 * In-app workflows that involve clicking on-screen controls: "Cut, then
 * Delete" inside a video editor, "Duplicate, then Merge" in an image editor.
 * The click-aware sibling of detectRepeatedSequences: two adjacent, different
 * steps in the SAME application, at least one of them a click (a pair of two
 * shortcuts stays repeatedSequence's job, so nothing is double-reported).
 * Same time window (SEQUENCE_WINDOW_MS) and spam guard as every other
 * sequence-shaped detector.
 *
 * Reported as a two-step `multiStepWorkflow`, offered like any other as a
 * one-press macro: a named-control click is found again by name at replay
 * time and a zone click is mapped onto the window's current bounds (see
 * main/actions/click.ts).
 */
function detectInAppClickPairs(events: WorkflowEvent[]): DetectedPattern[] {
  const steps = buildWorkflowSteps(events)

  const groups = new Map<
    string,
    { steps: [WorkflowStep, WorkflowStep]; timestamps: number[]; delaysMs: number[] }
  >()
  for (let i = 0; i < steps.length - 1; i++) {
    const first = steps[i]
    const second = steps[i + 1]
    if (first.step.type === 'appSwitch' || second.step.type === 'appSwitch') continue
    if (first.step.type !== 'click' && second.step.type !== 'click') continue
    if (first.step.applicationId !== second.step.applicationId) continue
    if (second.timestamp - first.timestamp > SEQUENCE_WINDOW_MS) continue
    // Moving the mouse from one control to another takes longer than this;
    // two "different" clicks closer together than MIN_REPEAT_GAP_MS are
    // button-mashing, not a two-step workflow (the pair-completion spam guard
    // alone lets an alternating burst through, since its completions land
    // every other click).
    if (second.timestamp - first.timestamp < MIN_REPEAT_GAP_MS) continue

    const firstSignature = stepSignature(first.step)
    const secondSignature = stepSignature(second.step)
    // Two identical clicks in a row are a repeated click, not a workflow.
    if (firstSignature === secondSignature) continue
    if (!chainMakesSense([first.step, second.step])) continue

    const key = `${firstSignature}->${secondSignature}`
    const delayMs = second.timestamp - first.timestamp
    const existing = groups.get(key)
    if (existing) {
      existing.timestamps.push(second.timestamp)
      existing.delaysMs.push(delayMs)
    } else {
      groups.set(key, { steps: [first.step, second.step], timestamps: [second.timestamp], delaysMs: [delayMs] })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, group] of groups) {
    const count = countSpacedOccurrences(group.timestamps)
    if (count < IN_APP_CLICK_THRESHOLD) continue

    const applicationId = group.steps[0].applicationId
    const sortedDelays = [...group.delaysMs].sort((a, b) => a - b)
    const medianDelayMs = sortedDelays[Math.floor(sortedDelays.length / 2)]
    patterns.push({
      id: `multistep:${key}`,
      kind: 'multiStepWorkflow',
      applicationId,
      applicationIds: [applicationId],
      contextApplicationId: applicationId,
      steps: group.steps,
      description: `${group.steps.map(describeStep).join(' → ')} repeated ${count} times`,
      count,
      sessionCount: countSessions(group.timestamps),
      consistency: 1,
      stepDelaysMs: [0, medianDelayMs]
    })
  }
  return patterns
}

// ---------------------------------------------------------------------------
// WORKFLOW LEARNING; multi-step, approximately-matched workflow detection.
// ---------------------------------------------------------------------------

export const MULTI_STEP_WORKFLOW_THRESHOLD = 3
const MULTI_STEP_MIN_LENGTH = 3
const MULTI_STEP_MAX_LENGTH = 6
/** A window needs at least this fraction of *distinct* steps to count as
 *  informative; rejects degenerate "A, B, A, B" filler that would
 *  otherwise pad out a window's length without saying anything new (STEP 4:
 *  "avoid extremely broad patterns such as keypress -> keypress -> keypress"). */
const MIN_INFORMATIVENESS = 0.5
/**
 * Two step-chains count as "the same workflow" once their longest-common-
 * subsequence ratio clears this bar AND they start and end on the same
 * step: the anchor requirement keeps matching semantically meaningful
 * (a chain that starts or ends somewhere completely different is a
 * different workflow, however similar its middle), while the ratio itself
 * is what lets one occurrence with an extra/missing middle step (e.g. an
 * uncaptured keystroke: see captureFilter.ts) still match another that
 * doesn't have it.
 */
const WORKFLOW_SIMILARITY_THRESHOLD = 0.75

interface WorkflowWindow {
  steps: WorkflowStep[]
  /** Real timestamp of each entry in `steps`, same order; kept so the
   *  chosen representative window's actual pacing survives into the final
   *  pattern (see `stepDelaysMs` below), not its shape. */
  stepTimestamps: number[]
  signatures: string[]
  /** Timestamp of the window's last step: this occurrence's marker for
   *  countSpacedOccurrences, same convention every other detector uses. */
  completedAt: number
}

/** `stepDelaysMs[i]` = real ms between `timestamps[i-1]` and `timestamps[i]`,
 *  `stepDelaysMs[0] = 0` (nothing precedes the first step); shared by every
 *  detector that reports a `stepDelaysMs`-carrying pattern. Capped at
 *  WORKFLOW_STEP_WINDOW_MS, which every caller's gap already is by
 *  construction (that's the continuity requirement that put the steps in
 *  the same window/pair to begin with): the cap is defensive, not load-bearing. */
function stepDelaysFromTimestamps(timestamps: number[]): number[] {
  return timestamps.map((timestamp, index) =>
    index === 0 ? 0 : Math.min(WORKFLOW_STEP_WINDOW_MS, Math.max(0, timestamp - timestamps[index - 1]))
  )
}

/** Every contiguous, time-continuous, sufficiently-informative window of
 *  length 3-6 steps in the given step stream: the raw candidates
 *  `clusterWorkflowWindows` groups into recurring workflows. */
function buildWorkflowWindows(steps: WorkflowStepEvent[]): WorkflowWindow[] {
  const windows: WorkflowWindow[] = []

  for (let length = MULTI_STEP_MIN_LENGTH; length <= MULTI_STEP_MAX_LENGTH; length++) {
    for (let start = 0; start + length <= steps.length; start++) {
      const slice = steps.slice(start, start + length)

      let continuous = true
      for (let i = 1; i < slice.length; i++) {
        const gap = slice[i].timestamp - slice[i - 1].timestamp
        // Too far apart to be one continuous chain; or, where a click is
        // involved, too close together to be two deliberate clicks (see
        // detectInAppClickPairs).
        const mashed =
          gap < MIN_REPEAT_GAP_MS && (slice[i].step.type === 'click' || slice[i - 1].step.type === 'click')
        if (gap > WORKFLOW_STEP_WINDOW_MS || mashed) {
          continuous = false
          break
        }
      }
      if (!continuous) continue

      const signatures = slice.map((s) => stepSignature(s.step))

      let hasAdjacentDuplicate = false
      for (let i = 1; i < signatures.length; i++) {
        if (signatures[i] === signatures[i - 1]) {
          hasAdjacentDuplicate = true
          break
        }
      }
      if (hasAdjacentDuplicate) continue

      const distinctCount = new Set(signatures).size
      if (distinctCount / signatures.length < MIN_INFORMATIVENESS) continue

      // Require either a genuine app switch (this is the "workflow" case
      // moving between contexts) or enough distinct steps to be a rich,
      // clearly-not-random same-app chain; mirrors the same reasoning
      // detectCrossAppWorkflows uses for its own 2-step case, generalized.
      // A click on a real on-screen control is a meaningful step in its own
      // right (Cut, then Delete), so a chain containing one is a candidate
      // even inside a single app.
      const hasAppSwitch = slice.some((s) => s.step.type === 'appSwitch' || s.step.type === 'click')
      if (!hasAppSwitch && distinctCount < 3) continue
      if (!chainMakesSense(slice.map((s) => s.step))) continue

      windows.push({
        steps: slice.map((s) => s.step),
        stepTimestamps: slice.map((s) => s.timestamp),
        signatures,
        completedAt: slice[slice.length - 1].timestamp
      })
    }
  }

  return windows
}

function lcsLength(a: string[], b: string[]): number {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1])
    }
  }
  return table[a.length][b.length]
}

/** 0 if the two chains don't start and end the same way; otherwise the
 *  Dice/LCS similarity ratio between them (1.0 for an exact match). */
function workflowSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  if (a[0] !== b[0] || a[a.length - 1] !== b[b.length - 1]) return 0
  return (2 * lcsLength(a, b)) / (a.length + b.length)
}

interface WorkflowCluster {
  representative: WorkflowWindow
  occurrences: WorkflowWindow[]
}

/**
 * Greedily groups windows into clusters of "the same workflow, approximately
 * matched": see WORKFLOW_SIMILARITY_THRESHOLD. Longer windows are
 * considered first and become representatives before shorter ones, so a
 * fuller chain anchors its cluster rather than a partial one; a window that
 * doesn't clear the similarity bar against any existing representative
 * starts a new cluster of its own.
 */
function clusterWorkflowWindows(windows: WorkflowWindow[]): WorkflowCluster[] {
  const clusters: WorkflowCluster[] = []
  const sorted = [...windows].sort(
    (a, b) => b.signatures.length - a.signatures.length || a.completedAt - b.completedAt
  )

  for (const window of sorted) {
    let best: WorkflowCluster | undefined
    let bestScore = 0
    for (const cluster of clusters) {
      const score = workflowSimilarity(cluster.representative.signatures, window.signatures)
      if (score > bestScore) {
        bestScore = score
        best = cluster
      }
    }

    if (best && bestScore >= WORKFLOW_SIMILARITY_THRESHOLD) {
      best.occurrences.push(window)
    } else {
      clusters.push({ representative: window, occurrences: [window] })
    }
  }

  return clusters
}

/**
 * The cluster's most common exact shape (by occurrence count, first-seen to
 * break ties). NOT necessarily the window that happened to seed the
 * cluster during greedy grouping (clusterWorkflowWindows may seed a cluster
 * with a longer, rarer, only-approximately-matching window before the more
 * common exact shape is even seen). Recomputing this after clustering is
 * what makes `consistency` mean what it says: "how many occurrences matched
 * the chain's *typical* shape," not "how many matched whatever the first
 * window happened to look like."
 */
function representativeWindow(occurrences: WorkflowWindow[]): WorkflowWindow {
  const buckets = new Map<string, { window: WorkflowWindow; count: number }>()
  for (const occurrence of occurrences) {
    const key = occurrence.signatures.join('|')
    const bucket = buckets.get(key)
    if (bucket) bucket.count += 1
    else buckets.set(key, { window: occurrence, count: 1 })
  }

  let best: { window: WorkflowWindow; count: number } | undefined
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket
  }
  return best!.window
}

/**
 * Recognizes recurring multi-step (3-6 step) chains. WORKFLOW LEARNING,
 * Noma's core differentiator: "screenshot -> switch to Claude Code -> paste
 * -> switch back," repeated, becomes one recognized workflow, not isolated
 * per-pair noise. Reuses the same time-continuity window
 * (WORKFLOW_STEP_WINDOW_MS) and spam guard (countSpacedOccurrences) every
 * other sequence-shaped detector in this file already uses; what's new is
 * approximate matching (clusterWorkflowWindows) so one occurrence with an
 * extra or missing middle step still counts as the same workflow, and a
 * containment pass (isContiguousSubarray) that keeps only the longest,
 * most-informative chain when several overlapping window lengths all
 * describe the same underlying repetition.
 */
export function detectMultiStepWorkflows(events: WorkflowEvent[]): DetectedPattern[] {
  const steps = buildWorkflowSteps(events)
  const windows = buildWorkflowWindows(steps)
  const clusters = clusterWorkflowWindows(windows)

  const candidates: Array<{
    representative: WorkflowWindow
    count: number
    consistency: number
    timestamps: number[]
  }> = []

  for (const cluster of clusters) {
    const count = countSpacedOccurrences(cluster.occurrences.map((occurrence) => occurrence.completedAt))
    if (count < MULTI_STEP_WORKFLOW_THRESHOLD) continue

    const representative = representativeWindow(cluster.occurrences)
    const exactMatches = cluster.occurrences.filter(
      (occurrence) => occurrence.signatures.join('|') === representative.signatures.join('|')
    ).length
    const consistency = exactMatches / cluster.occurrences.length

    candidates.push({
      representative,
      count,
      consistency,
      timestamps: cluster.occurrences.map((occurrence) => occurrence.completedAt)
    })
  }

  // Keep only the longest chain among any that are contiguous subsets of a
  // longer surviving one: the "screenshot -> Claude Code -> paste" chain
  // should produce exactly one suggestion, not also a redundant "screenshot
  // -> Claude Code" one for the same underlying behavior.
  const sortedByLength = [...candidates].sort(
    (a, b) => b.representative.signatures.length - a.representative.signatures.length
  )
  const kept: typeof candidates = []
  for (const candidate of sortedByLength) {
    const subsumed = kept.some((longer) =>
      isContiguousSubarray(candidate.representative.signatures, longer.representative.signatures)
    )
    if (!subsumed) kept.push(candidate)
  }

  // A loop done several times in a row shows up once per starting point:
  // "Edit → Select all → Copy", "Select all → Copy → Edit", "Copy → Edit →
  // Select all". Same steps, so the same workflow; keep the rotation seen
  // most often, which is where the user actually starts it.
  const stepSet = (candidate: (typeof candidates)[number]): string =>
    [...candidate.representative.signatures].sort().join('|')
  const byCount = [...kept].sort((a, b) => b.count - a.count)
  const seenSets = new Set<string>()
  const rotationsRemoved = byCount.filter((candidate) => {
    const set = stepSet(candidate)
    if (seenSets.has(set)) return false
    seenSets.add(set)
    return true
  })

  const patterns: DetectedPattern[] = []
  for (const candidate of rotationsRemoved) {
    const { representative, count, consistency } = candidate
    const applicationIds = [...new Set(representative.steps.map((step) => step.applicationId))]
    const contextApplicationId = representative.steps[0]?.applicationId ?? null
    const chain = representative.steps.map(describeStep).join(' → ')

    patterns.push({
      id: `multistep:${representative.signatures.join('->')}`,
      kind: 'multiStepWorkflow',
      applicationId: contextApplicationId,
      applicationIds,
      contextApplicationId,
      steps: representative.steps,
      description: `${chain} repeated ${count} times`,
      count,
      sessionCount: countSessions(candidate.timestamps),
      consistency,
      stepDelaysMs: stepDelaysFromTimestamps(representative.stepTimestamps)
    })
  }

  return patterns
}
