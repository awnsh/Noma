import type { HoloZone, HoloZoneProfile } from '@shared/types'

/**
 * Holo's DSP — deliberately simple, pure, framework/DOM-free math so it's
 * unit-testable the same way patternDetection.ts is, with none of the
 * actual `AudioContext`/`getUserMedia` glue (see holoCapture.ts, which is
 * NOT unit tested for the same reason `windowsAdapter.ts`'s real PowerShell
 * process isn't — jsdom has no Web Audio implementation to test against).
 *
 * This is a simplified, from-scratch reimplementation of the *concept*
 * behind github.com/JustinGamer191/Holo (tap-the-desk zones -> actions,
 * MIT-licensed) — not a port of its Swift code, which never runs here.
 * Holo's real pipeline (per its README) is a regularized linear classifier
 * over passive/active acoustic features with novelty-checking gates; this
 * is a nearest-centroid classifier over a coarse spectral-shape descriptor,
 * gated by a distance margin (and an explicit trained "reject" reference —
 * see `classifyZone`) instead of a trained model. Simpler and less
 * accurate by design, proportionate to a free feature with no hardware
 * cost — not a claim of parity with Holo's own real pipeline.
 */

/** How many frequency bands a raw FFT magnitude spectrum collapses into —
 *  coarse enough to be robust to small pitch/mic variance between taps of
 *  the same zone, fine enough to still separate different zones. */
export const FEATURE_BAND_COUNT = 16

/** Root-mean-square amplitude of a time-domain sample buffer — the
 *  loudness measure the onset detector watches for a sudden rise in. */
export function computeRms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0
  let sumSquares = 0
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i]
  }
  return Math.sqrt(sumSquares / samples.length)
}

/**
 * Reduces a raw FFT magnitude spectrum (e.g. AnalyserNode.getByteFrequencyData,
 * one non-negative number per bin) to a small, normalized "spectral shape"
 * descriptor: `bandCount` bands, each the average magnitude of an equal
 * slice of bins, divided by the loudest band. Dividing by the peak matters —
 * it makes the vector describe *shape* (which frequencies are relatively
 * strongest) rather than raw loudness, since loudness varies with tap
 * force/distance in ways that don't reliably distinguish desk zones, while
 * shape (how a rigid desk surface's resonance differs depending on where
 * an impact lands relative to the laptop's mic) does.
 */
export function extractFeatures(magnitudes: ArrayLike<number>, bandCount = FEATURE_BAND_COUNT): number[] {
  if (magnitudes.length === 0) return new Array(bandCount).fill(0)

  const bandSize = Math.max(1, Math.floor(magnitudes.length / bandCount))
  const bands: number[] = []
  for (let band = 0; band < bandCount; band++) {
    const start = band * bandSize
    const end = band === bandCount - 1 ? magnitudes.length : Math.min(start + bandSize, magnitudes.length)
    let sum = 0
    let count = 0
    for (let i = start; i < end; i++) {
      sum += magnitudes[i]
      count++
    }
    bands.push(count ? sum / count : 0)
  }

  const peak = Math.max(...bands, 1e-6)
  return bands.map((value) => value / peak)
}

/** Averages several calibration taps' feature vectors into one zone
 *  profile. Empty input returns an empty vector rather than throwing —
 *  callers (the calibration wizard) never call this with zero taps in
 *  practice, but a pure function shouldn't crash on a degenerate input. */
export function averageFeatureVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const length = vectors[0].length
  const sums = new Array(length).fill(0)
  for (const vector of vectors) {
    for (let i = 0; i < length; i++) sums[i] += vector[i] ?? 0
  }
  return sums.map((sum) => sum / vectors.length)
}

export function euclideanDistance(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let sumSquares = 0
  for (let i = 0; i < length; i++) {
    const diff = a[i] - b[i]
    sumSquares += diff * diff
  }
  return Math.sqrt(sumSquares)
}

export interface ClassificationResult {
  zone: HoloZone | null
  /** How much more confidently the best match won over the runner-up, as a
   *  fraction of the runner-up's own distance — not a probability. 0 means
   *  "no calibrated zones," "only one," or "too ambiguous to trust"; higher
   *  is a cleaner win. `zone` is null whenever this is below the margin
   *  gate, even though a "best guess" technically existed. */
  confidence: number
}

/** Minimum margin the best match needs over the second-best before it's
 *  trusted — without this, a tap right on the boundary between two zones
 *  would confidently fire whichever one happened to be a hair closer,
 *  misfiring on real, honest taps rather than reporting "unclear." This is
 *  this classifier's whole stand-in for Holo's own trained novelty gate. */
const MIN_CONFIDENCE_MARGIN = 0.08

/**
 * A first-pass constant, not yet tuned against real recordings (flagged
 * here so a future session doesn't mistake it for settled): the farthest a
 * tap's feature vector can be from its *nearest* calibrated profile and
 * still be trusted at all, regardless of margin. Without this, a sound
 * that doesn't resemble any calibrated zone — or the reject reference,
 * below — even a little would still get force-matched to whichever
 * calibrated profile happened to be least-bad, since nearest-centroid has
 * no built-in notion of "none of these." Distances here are Euclidean over
 * 16 bands each normalized to at most 1, so this is comfortably inside the
 * ~4.0 theoretical max while still well above the distances a genuinely
 * matching tap produces in the classifyZone tests.
 */
const MAX_TRUSTED_DISTANCE = 0.9

/**
 * Nearest-centroid classification against calibrated zone profiles, gated
 * two ways: an absolute-distance cap (MAX_TRUSTED_DISTANCE — "does this
 * resemble any calibrated sound at all") and a relative margin over the
 * runner-up (MIN_CONFIDENCE_MARGIN — "is it clearly the *best* one").
 *
 * `rejectFeatures` is an optional reference vector for "not a desk tap at
 * all" (typing, mouse clicks, ambient noise — whatever the user
 * demonstrated during calibration's reject step, see holoStore.ts). It's
 * treated as just another candidate in the same nearest-centroid pool: if
 * it wins, this reports `zone: null` immediately, before either gate above
 * even runs — the whole point of training it is to catch sounds that might
 * otherwise pass both gates by resembling one zone more than the others,
 * the way a sharp keyboard clack can still be "closest" to one particular
 * zone's profile purely by chance even though it isn't a desk tap.
 */
export function classifyZone(
  features: number[],
  profiles: HoloZoneProfile[],
  rejectFeatures?: number[]
): ClassificationResult {
  const candidates: Array<{ zone: HoloZone | null; distance: number }> = profiles.map((profile) => ({
    zone: profile.zone,
    distance: euclideanDistance(features, profile.features)
  }))
  if (rejectFeatures) {
    candidates.push({ zone: null, distance: euclideanDistance(features, rejectFeatures) })
  }
  if (candidates.length === 0) return { zone: null, confidence: 0 }

  candidates.sort((a, b) => a.distance - b.distance)
  const [best, runnerUp] = candidates

  // The reject reference itself was the closest match — this doesn't
  // resemble a real zone tap closely enough to even compete, regardless of
  // how the rest of the gates below would have scored it.
  if (best.zone === null) return { zone: null, confidence: 0 }

  if (best.distance > MAX_TRUSTED_DISTANCE) return { zone: null, confidence: 0 }

  if (!runnerUp) {
    // Only one calibrated zone (and no reject reference) — nothing to
    // compare against, so a real margin can't be computed. Still the only
    // honest guess available, but reported at zero confidence rather than
    // pretending certainty.
    return { zone: best.zone, confidence: 0 }
  }

  const margin = runnerUp.distance === 0 ? 0 : 1 - best.distance / runnerUp.distance
  if (margin < MIN_CONFIDENCE_MARGIN) return { zone: null, confidence: margin }
  return { zone: best.zone, confidence: Math.min(1, margin) }
}

export interface OnsetDetectorState {
  noiseFloor: number
}

export function createOnsetDetectorState(initialNoiseFloor = 0): OnsetDetectorState {
  return { noiseFloor: initialNoiseFloor }
}

/** Well above any steady-state room/fan/typing noise, well below a real
 *  knuckle-on-desk tap's peak RMS — picked empirically-in-spirit the same
 *  way MIN_REPEAT_GAP_MS was in patternDetection.ts (a deliberate constant
 *  to revisit if real-world testing says otherwise, not an arbitrary one). */
const ONSET_MULTIPLIER = 3.5
/** How fast the rolling noise floor adapts to a genuinely quieter/louder
 *  room — slow enough that a single loud frame can't be mistaken for the
 *  new floor. */
const NOISE_FLOOR_EMA_ALPHA = 0.05
/** Floor-of-the-floor: prevents a near-silent room from making the
 *  threshold collapse toward zero and firing on any faint sound at all. */
const MIN_NOISE_FLOOR = 0.01

/**
 * Decides whether this frame's RMS amplitude is a tap onset, and updates
 * the rolling noise-floor estimate in place — an exponential moving
 * average updated only from *non-onset* frames, so a real tap's own energy
 * (or its decay tail) can never drag the floor up and desensitize
 * detection right when a real tap just happened.
 */
export function detectOnset(rms: number, state: OnsetDetectorState): boolean {
  const floor = Math.max(state.noiseFloor, MIN_NOISE_FLOOR)
  const isOnset = rms > floor * ONSET_MULTIPLIER
  if (!isOnset) {
    state.noiseFloor = state.noiseFloor * (1 - NOISE_FLOOR_EMA_ALPHA) + rms * NOISE_FLOOR_EMA_ALPHA
  }
  return isOnset
}
