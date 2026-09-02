import type { DetectedPattern, WorkflowEvent } from '@shared/types'

/**
 * Deterministic/statistical pattern detection (brainstorm.md sections
 * 11-12) — explicitly NOT an LLM. Pure functions over already-captured,
 * already-sanitized WorkflowEvent metadata, so this is trivially unit
 * testable with synthetic events and never touches the database itself.
 *
 * Covers 3 of the 5 categories section 11 lists: repeated shortcuts,
 * repeated sequences, and frequently used controls. "Underused controls"
 * and "application-specific behavior" are deliberately deferred — both
 * need more context (the full set of configured controls, and a richer
 * per-application baseline) than is worth building before there's a
 * suggestion engine (Phase 5) to act on it.
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
 * or control are realistically never closer together than this — a real
 * press-release-press-again takes at least a brief moment. Anything faster
 * is either the OS's own key-repeat while a key is held down (as fast as
 * ~30ms between repeats) or someone mashing a button in a quick burst
 * (testing it, venting, curious what it does) — neither is a distinct
 * repeated *workflow*, which is what these patterns are meant to catch.
 * Without this, 5 presses in the same half-second would look identical to
 * a suggestion engine as 5 uses genuinely spread across a real work
 * session, and Flow would offer to dedicate a control to something that
 * was never actually repeated on purpose. Picked well above key-repeat's
 * fastest rate and well below the gap between any two legitimately
 * separate real uses.
 */
const MIN_REPEAT_GAP_MS = 400

/**
 * Collapses a burst of same-key timestamps down to how many *count* as
 * separate, deliberate occurrences: keeps the first, then skips every
 * later one that lands within MIN_REPEAT_GAP_MS of the last one actually
 * counted. A real, spread-out repeated workflow passes through untouched
 * (every real gap is already well above the floor); a spam burst collapses
 * toward a single occurrence, so it can't rack up a threshold on its own —
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

export function detectPatterns(events: WorkflowEvent[]): DetectedPattern[] {
  return [
    ...detectRepeatedShortcuts(events),
    ...detectFrequentControls(events),
    ...detectRepeatedSequences(events)
  ]
}

function detectRepeatedShortcuts(events: WorkflowEvent[]): DetectedPattern[] {
  const groups = new Map<
    string,
    { applicationId: string | null; comboKeys: string[]; timestamps: number[] }
  >()

  for (const event of events) {
    if (event.eventType !== 'shortcut' || !event.comboKeys) continue
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
    // (e.g. Ctrl+T x5, typed fast) is not a sequence — it's just
    // detectRepeatedShortcuts' job, and double-counting it here used to
    // produce a nonsensical "Ctrl+T -> Ctrl+T" two-step macro suggestion.
    if (first.comboKeys.join('+') === second.comboKeys.join('+')) continue

    const sequence = [first.comboKeys.join('+'), second.comboKeys.join('+')]
    const key = `${first.applicationId ?? 'unknown'}::${sequence.join('->')}`
    // The pair's completion time (when the second step actually happened)
    // is this occurrence's marker for the same spam guard used above —
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
      sequence: value.sequence
    })
  }
  return patterns
}
