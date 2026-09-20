import type { DetectedPattern, SuggestionStatus } from '@shared/types'
import { stepSignature } from '../workflow/patternDetection'
import { chainPlausibility, inAppCoherence, matchRealisticWorkflow } from '../workflow/appKnowledge'

/**
 * Workflow quality: decides which detected patterns are worth *showing*, and
 * learns that from the user. Two jobs, both pure/DB-free (persistence lives in
 * qualityModelRepository.ts and suggestionsRepository.ts):
 *
 * 1. DEDUPLICATION — a pattern's `id` embeds its exact step chain, which
 *    drifts as data accrues (the cluster's "typical shape" changes, a periodic
 *    loop A→B→C→A shows up once per rotation, a 2-step pair is contained in a
 *    3-step chain). Id-based dedupe treats each as new. A *fingerprint* — the
 *    sorted set of step signatures — is stable across all of those, so
 *    "same workflow" is decided on it instead.
 *
 * 2. LEARNING — a small online logistic-regression model over pattern
 *    features. It starts from hand-set priors (single-burst and inconsistent
 *    patterns look like noise; repeats across separate sittings look like
 *    habits — no user input needed) and is nudged by every accept / reject /
 *    dismiss, including per-app and per-step weights so "anything in
 *    Explorer is noise for me" is something it can actually learn.
 */

// ---------------------------------------------------------------------------
// Fingerprints & duplicate detection
// ---------------------------------------------------------------------------

/** Kinds whose suggestions describe a multi-step behavior and so can overlap
 *  one another. repeatedShortcut / frequentControl are single-item and keep
 *  plain id-based dedupe. */
export function isWorkflowKind(kind: DetectedPattern['kind']): boolean {
  return kind === 'repeatedSequence' || kind === 'crossAppWorkflow' || kind === 'multiStepWorkflow'
}

/** Order-insensitive, rotation-proof identity of a pattern: its distinct
 *  step signatures, sorted. */
export function patternFingerprint(pattern: DetectedPattern): string[] {
  let signatures: string[]
  switch (pattern.kind) {
    case 'repeatedShortcut':
      signatures = [`key:${pattern.applicationId ?? 'unknown'}:${pattern.comboKeys.join('+')}`]
      break
    case 'repeatedSequence':
      signatures = pattern.sequence.map((combo) => `key:${pattern.applicationId ?? 'unknown'}:${combo}`)
      break
    case 'frequentControl':
      signatures = [`control:${pattern.applicationId ?? 'unknown'}:${pattern.controlId}`]
      break
    case 'crossAppWorkflow':
    case 'multiStepWorkflow':
      signatures = pattern.steps.map(stepSignature)
      break
  }
  return [...new Set(signatures)].sort()
}

/** Above this Jaccard overlap two fingerprints are "the same workflow". */
const SAME_WORKFLOW_JACCARD = 0.75

export type FingerprintRelation = 'same' | 'newContainsExisting' | 'newInsideExisting' | 'unrelated'

/** How a freshly-detected fingerprint relates to one already suggested. */
export function relateFingerprints(fresh: string[], existing: string[]): FingerprintRelation {
  if (fresh.length === 0 || existing.length === 0) return 'unrelated'
  const freshSet = new Set(fresh)
  const existingSet = new Set(existing)
  let shared = 0
  for (const value of freshSet) if (existingSet.has(value)) shared += 1
  if (shared === 0) return 'unrelated'

  const union = freshSet.size + existingSet.size - shared
  if (shared / union >= SAME_WORKFLOW_JACCARD) return 'same'
  if (shared === existingSet.size && existingSet.size >= 2) return 'newContainsExisting'
  if (shared === freshSet.size && freshSet.size >= 2) return 'newInsideExisting'
  return 'unrelated'
}

export interface KnownSuggestion {
  id: string
  status: SuggestionStatus
  fingerprint: string[]
}

export type DuplicateVerdict =
  | { action: 'insert' }
  | { action: 'skip' }
  /** The new pattern is a fuller version of these still-pending suggestions:
   *  replace them rather than showing both. */
  | { action: 'supersede'; ids: string[] }

/**
 * Decides what to do with a new workflow-kind suggestion given everything
 * already suggested. Anything already resolved (accepted, rejected,
 * dismissed) that matches — or already covers — the new one blocks it, so a
 * decision is never resurrected under a slightly different shape. A
 * genuinely fuller chain than a resolved one is allowed through; a fuller
 * chain than a *pending* one replaces it, so the user sees one card.
 */
export function judgeDuplicate(fresh: string[], known: KnownSuggestion[]): DuplicateVerdict {
  const supersede: string[] = []
  for (const entry of known) {
    const relation = relateFingerprints(fresh, entry.fingerprint)
    if (relation === 'unrelated') continue
    if (relation === 'same' || relation === 'newInsideExisting') return { action: 'skip' }
    if (entry.status === 'pending') supersede.push(entry.id)
  }
  return supersede.length > 0 ? { action: 'supersede', ids: supersede } : { action: 'insert' }
}

// ---------------------------------------------------------------------------
// Feature extraction & the learned model
// ---------------------------------------------------------------------------

export type PatternFeatures = Record<string, number>

export function extractFeatures(pattern: DetectedPattern): PatternFeatures {
  const fingerprint = patternFingerprint(pattern)
  const features: PatternFeatures = {
    bias: 1,
    [`kind:${pattern.kind}`]: 1,
    length: Math.min(fingerprint.length, 6) / 6,
    count: Math.min(pattern.count, 10) / 10
  }

  // Per-app / per-step features are what let the model learn user-specific
  // taste. Scaled down so a long chain's many steps don't drown the rest.
  const stepWeight = 1 / Math.sqrt(Math.max(fingerprint.length, 1))
  const apps = new Set<string>()
  for (const signature of fingerprint) {
    features[`step:${signature}`] = stepWeight
    const app = signature.split(':')[1]
    if (app) apps.add(app)
  }
  for (const app of apps) features[`app:${app}`] = stepWeight
  features.appCount = Math.min(apps.size, 4) / 4

  if (pattern.sessionCount !== undefined) {
    if (pattern.sessionCount <= 1) features.singleBurst = 1
    else features.sessions = Math.min(pattern.sessionCount, 4) / 4
  }

  // Logical plausibility (workflow/appKnowledge.ts): is this a hop people
  // actually make? Centered on 0.5 = "no opinion", so unrecognized apps are
  // neither helped nor hurt.
  if (pattern.kind === 'crossAppWorkflow' || pattern.kind === 'multiStepWorkflow') {
    const appChain = pattern.steps.map((step) => step.applicationId)
    const plausibility = chainPlausibility(appChain)
    if (plausibility !== null) {
      features.plausibility = plausibility - 0.5
      if (plausibility < IMPLAUSIBLE_BELOW) features.implausible = 1
    }
    if (matchRealisticWorkflow(appChain)) features.realisticWorkflow = 1
  } else if (pattern.kind === 'repeatedSequence') {
    features.coherence = inAppCoherence(pattern.applicationId, pattern.sequence[0], pattern.sequence[1]) - 0.5
  }

  // Position-only clicks (apps that expose no named controls) are a weaker
  // signal than a named button, so they start out a little less trusted.
  if ((pattern.kind === 'multiStepWorkflow' || pattern.kind === 'crossAppWorkflow') &&
      pattern.steps.some((step) => step.type === 'click' && step.target.startsWith('zone:'))) {
    features.zoneClick = 1
  }

  if (pattern.kind === 'multiStepWorkflow') {
    // Centered so a typical ~0.85 contributes nothing and only clearly loose
    // or clearly rock-solid patterns move the score.
    features.consistency = pattern.consistency - 0.85
  }
  if (pattern.kind === 'crossAppWorkflow' && pattern.closingStep) features.closingStep = 1

  return features
}

/** A chain scoring under this is flagged outright as implausible. */
const IMPLAUSIBLE_BELOW = 0.25

/** Hand-set starting weights: what "looks like noise" before the user has
 *  taught the model anything. */
const PRIOR_WEIGHTS: Record<string, number> = {
  bias: 0.6,
  count: 0.6,
  singleBurst: -0.8,
  sessions: 0.8,
  consistency: 1.5,
  closingStep: 0.5,
  plausibility: 5,
  implausible: -1,
  realisticWorkflow: 0.6,
  zoneClick: -0.3,
  coherence: 2.5
}

export interface QualityModel {
  /** Learned deltas on top of PRIOR_WEIGHTS. */
  weights: Record<string, number>
  /** Labeled examples trained on so far. */
  examples: number
}

export function emptyModel(): QualityModel {
  return { weights: {}, examples: 0 }
}

/** Specific features (this app, this step) learn fast — "no to Explorer" is
 *  the lesson being taught. Shared features (bias, length, consistency…)
 *  learn slowly, so rejecting one pattern doesn't drag every unrelated
 *  workflow down with it; they only shift meaningfully over many labels. */
const SPECIFIC_LEARNING_RATE = 0.9
const SHARED_LEARNING_RATE = 0.1
const WEIGHT_LIMIT = 3
/** Hidden below this probability. Cold-start priors only reject the clearest
 *  junk; the rest of the filtering is what gets learned. */
export const SUGGEST_THRESHOLD = 0.4

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/** Probability (0-1) the user would want this pattern suggested. */
export function scorePattern(model: QualityModel, features: PatternFeatures): number {
  let logit = 0
  for (const [name, value] of Object.entries(features)) {
    logit += ((PRIOR_WEIGHTS[name] ?? 0) + (model.weights[name] ?? 0)) * value
  }
  return sigmoid(logit)
}

export function shouldSuggest(model: QualityModel, features: PatternFeatures): boolean {
  return scorePattern(model, features) >= SUGGEST_THRESHOLD
}

/** How strongly each resolution counts as a label. "Dismissed" means "not
 *  now", a weaker no than an explicit rejection. */
const LABELS: Record<'accepted' | 'rejected' | 'dismissed', { target: number; strength: number }> = {
  accepted: { target: 1, strength: 1 },
  rejected: { target: 0, strength: 1 },
  dismissed: { target: 0, strength: 0.4 }
}

/** One online gradient step on a resolved suggestion's features. Returns a
 *  new model; does not mutate. */
export function trainModel(
  model: QualityModel,
  features: PatternFeatures,
  status: 'accepted' | 'rejected' | 'dismissed'
): QualityModel {
  const { target, strength } = LABELS[status]
  const error = target - scorePattern(model, features)
  const weights = { ...model.weights }
  for (const [name, value] of Object.entries(features)) {
    const rate = name.startsWith('app:') || name.startsWith('step:') ? SPECIFIC_LEARNING_RATE : SHARED_LEARNING_RATE
    const next = (weights[name] ?? 0) + rate * strength * error * value
    weights[name] = Math.max(-WEIGHT_LIMIT, Math.min(WEIGHT_LIMIT, next))
  }
  return { weights, examples: model.examples + 1 }
}
