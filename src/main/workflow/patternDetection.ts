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

const REPEATED_SHORTCUT_THRESHOLD = 5
const FREQUENT_CONTROL_THRESHOLD = 5
const SEQUENCE_THRESHOLD = 3
/** Two shortcuts count as "in sequence" only if they happen within this window. */
const SEQUENCE_WINDOW_MS = 15_000

export function detectPatterns(events: WorkflowEvent[]): DetectedPattern[] {
  return [
    ...detectRepeatedShortcuts(events),
    ...detectFrequentControls(events),
    ...detectRepeatedSequences(events)
  ]
}

function detectRepeatedShortcuts(events: WorkflowEvent[]): DetectedPattern[] {
  const counts = new Map<
    string,
    { applicationId: string | null; comboKeys: string[]; count: number }
  >()

  for (const event of events) {
    if (event.eventType !== 'shortcut' || !event.comboKeys) continue
    const key = `${event.applicationId ?? 'unknown'}::${event.comboKeys.join('+')}`
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, { applicationId: event.applicationId, comboKeys: event.comboKeys, count: 1 })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, value] of counts) {
    if (value.count < REPEATED_SHORTCUT_THRESHOLD) continue
    patterns.push({
      id: `shortcut:${key}`,
      kind: 'repeatedShortcut',
      applicationId: value.applicationId,
      description: `${value.comboKeys.join('+')} used ${value.count} times`,
      count: value.count
    })
  }
  return patterns
}

function detectFrequentControls(events: WorkflowEvent[]): DetectedPattern[] {
  const counts = new Map<
    string,
    { applicationId: string | null; controlId: string; count: number }
  >()

  for (const event of events) {
    if (event.eventType !== 'controlActivation' || !event.controlId) continue
    const key = `${event.applicationId ?? 'unknown'}::${event.controlId}`
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, { applicationId: event.applicationId, controlId: event.controlId, count: 1 })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, value] of counts) {
    if (value.count < FREQUENT_CONTROL_THRESHOLD) continue
    patterns.push({
      id: `control:${key}`,
      kind: 'frequentControl',
      applicationId: value.applicationId,
      description: `Control "${value.controlId}" activated ${value.count} times`,
      count: value.count
    })
  }
  return patterns
}

function detectRepeatedSequences(events: WorkflowEvent[]): DetectedPattern[] {
  const shortcutEvents = events
    .filter((event) => event.eventType === 'shortcut' && !!event.comboKeys)
    .sort((a, b) => a.timestamp - b.timestamp)

  const counts = new Map<
    string,
    { applicationId: string | null; sequence: string[]; count: number }
  >()

  for (let i = 0; i < shortcutEvents.length - 1; i++) {
    const first = shortcutEvents[i]
    const second = shortcutEvents[i + 1]
    if (!first.comboKeys || !second.comboKeys) continue
    if (second.timestamp - first.timestamp > SEQUENCE_WINDOW_MS) continue
    if (first.applicationId !== second.applicationId) continue

    const sequence = [first.comboKeys.join('+'), second.comboKeys.join('+')]
    const key = `${first.applicationId ?? 'unknown'}::${sequence.join('->')}`
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, { applicationId: first.applicationId, sequence, count: 1 })
    }
  }

  const patterns: DetectedPattern[] = []
  for (const [key, value] of counts) {
    if (value.count < SEQUENCE_THRESHOLD) continue
    patterns.push({
      id: `sequence:${key}`,
      kind: 'repeatedSequence',
      applicationId: value.applicationId,
      description: `${value.sequence.join(' → ')} repeated ${value.count} times`,
      count: value.count
    })
  }
  return patterns
}
