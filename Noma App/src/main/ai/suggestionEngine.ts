import { detectPatterns } from '../workflow/patternDetection'
import { getWorkflowEventsSince } from '../database/repositories/workflowEventsRepository'
import {
  deletePendingSuggestion,
  getStoredFingerprints,
  insertSuggestionIfNew,
  setSuggestionPatternMeta
} from '../database/repositories/suggestionsRepository'
import { loadQualityModel } from '../database/repositories/qualityModelRepository'
import { startOfTodayMs } from '../workflow/timeWindows'
import {
  extractFeatures,
  isWorkflowKind,
  judgeDuplicate,
  patternFingerprint,
  relateFingerprints,
  shouldSuggest,
  type KnownSuggestion
} from './workflowQuality'
import type { AIProvider } from './types'

/**
 * Orchestrates the OBSERVE -> IDENTIFY PATTERN -> GENERATE SUGGESTION half
 * of the learning loop (brainstorm.md section 14): reads today's already-
 * captured workflow events, runs deterministic pattern detection over
 * them, hands the results to whichever AIProvider is configured, and
 * persists the suggestions that survive two filters (workflowQuality.ts):
 *
 * - the learned quality model, trained by the user's accept/reject/dismiss
 *   history, drops patterns that look like the kind they've said no to; and
 * - fingerprint-based dedupe, so the same workflow never appears twice under
 *   a slightly different step chain (a rotated loop, a drifted "typical
 *   shape", a pair already covered by a fuller chain).
 *
 * Safe to call repeatedly and often — `insertSuggestionIfNew` is still a
 * no-op for an exact id already suggested (any status), so this never
 * resurrects a decision the user already made.
 */
export class SuggestionEngine {
  constructor(private readonly provider: AIProvider) {}

  async refresh(): Promise<void> {
    const events = getWorkflowEventsSince(startOfTodayMs())
    const patterns = detectPatterns(events)
    const patternsById = new Map(patterns.map((pattern) => [`suggestion:${pattern.id}`, pattern]))
    const suggestions = await this.provider.generateSuggestions(patterns)

    const model = loadQualityModel()
    const known: KnownSuggestion[] = []
    const confidenceById = new Map<string, number>()
    for (const stored of getStoredFingerprints()) {
      let fingerprint = stored.fingerprint
      if (!fingerprint) {
        // Row from before fingerprints existed: backfill it if its pattern
        // is being detected right now, otherwise it can't take part in
        // dedupe (and is simply left alone).
        const pattern = patternsById.get(stored.id)
        if (!pattern) continue
        fingerprint = patternFingerprint(pattern)
        setSuggestionPatternMeta(stored.id, { fingerprint, features: extractFeatures(pattern) })
      }
      known.push({ id: stored.id, status: stored.status, fingerprint })
      confidenceById.set(stored.id, stored.confidence)
    }
    this.collapsePendingDuplicates(known, confidenceById)

    // Fuller chains first, so a 3-step chain claims the workflow before the
    // 2-step pair it contains; higher confidence breaks ties.
    const ordered = suggestions
      .map((suggestion) => ({ suggestion, pattern: patternsById.get(suggestion.id) }))
      .sort(
        (a, b) =>
          (b.pattern ? patternFingerprint(b.pattern).length : 0) -
            (a.pattern ? patternFingerprint(a.pattern).length : 0) ||
          b.suggestion.confidence - a.suggestion.confidence
      )

    for (const { suggestion, pattern } of ordered) {
      if (!pattern) {
        insertSuggestionIfNew(suggestion)
        continue
      }

      const fingerprint = patternFingerprint(pattern)
      const features = extractFeatures(pattern)
      if (known.some((entry) => entry.id === suggestion.id)) continue
      if (!shouldSuggest(model, features)) continue

      if (isWorkflowKind(pattern.kind)) {
        const verdict = judgeDuplicate(fingerprint, known)
        if (verdict.action === 'skip') continue
        if (verdict.action === 'supersede') {
          for (const id of verdict.ids) {
            deletePendingSuggestion(id)
            const index = known.findIndex((entry) => entry.id === id)
            if (index !== -1) known.splice(index, 1)
          }
        }
      }

      insertSuggestionIfNew(suggestion, { fingerprint, features })
      known.push({ id: suggestion.id, status: 'pending', fingerprint })
    }
  }

  /**
   * Cleans up duplicates already sitting in the pending list from before
   * fingerprint dedupe existed: among pending multi-step suggestions that are
   * the same workflow (or one inside another), keeps the fullest, then the
   * most confident, and deletes the rest. Only ever deletes pending rows.
   */
  private collapsePendingDuplicates(known: KnownSuggestion[], confidenceById: Map<string, number>): void {
    const pending = known
      .filter((entry) => entry.status === 'pending' && !/^suggestion:(shortcut|control):/.test(entry.id))
      .sort(
        (a, b) =>
          b.fingerprint.length - a.fingerprint.length ||
          (confidenceById.get(b.id) ?? 0) - (confidenceById.get(a.id) ?? 0)
      )

    const kept: KnownSuggestion[] = []
    for (const entry of pending) {
      const duplicate = kept.some((other) => {
        const relation = relateFingerprints(entry.fingerprint, other.fingerprint)
        return relation === 'same' || relation === 'newInsideExisting'
      })
      if (!duplicate) {
        kept.push(entry)
        continue
      }
      deletePendingSuggestion(entry.id)
      known.splice(known.indexOf(entry), 1)
    }
  }
}
