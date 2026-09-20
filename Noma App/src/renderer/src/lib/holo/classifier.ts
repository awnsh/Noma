import type { HoloZone, HoloZoneProfile } from '@shared/types'

/**
 * Holo's DSP — pure, framework/DOM-free math so it's unit-testable without
 * any real audio hardware (holoCapture.ts owns the Web Audio glue and is
 * not unit tested; jsdom has no Web Audio implementation).
 *
 * This is a from-scratch reimplementation of the *concept* behind
 * github.com/JustinGamer191/Holo (tap-the-desk zones -> actions), built to
 * run on any computer with at least one microphone — not a port of its
 * macOS/Swift code. Pipeline:
 *
 *   raw samples (every mic channel, no browser DSP)
 *     -> block-energy onset detection (onset detector below)
 *     -> a short window per channel, aligned to where the tap actually starts
 *     -> Hann + FFT -> log-spaced band levels in dB ("spectral shape"),
 *        plus spectral centroid and decay shape
 *     -> with >1 channel: relative level between channels, and (for
 *        channels of the same physical device) inter-channel arrival delay
 *     -> standardized nearest-centroid classification with an absolute
 *        "does this even resemble a calibrated tap" gate
 *
 * With one mic the zones are told apart purely by how the desk rings
 * (tone + decay); every additional mic channel adds real spatial
 * information (which mic heard it louder / earlier), so accuracy improves
 * automatically with hardware — nothing here assumes a particular count.
 */

// ---------------------------------------------------------------- FFT

/** In-place iterative radix-2 FFT. `re.length` must be a power of two. */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)
    for (let start = 0; start < n; start += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const a = start + k
        const b = a + len / 2
        const tRe = re[b] * curRe - im[b] * curIm
        const tIm = re[b] * curIm + im[b] * curRe
        re[b] = re[a] - tRe
        im[b] = im[a] - tIm
        re[a] += tRe
        im[a] += tIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
}

/** Power spectrum (bins 0..n/2) of a Hann-windowed, mean-removed segment. */
export function powerSpectrum(segment: ArrayLike<number>): Float64Array {
  const n = segment.length
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  let mean = 0
  for (let i = 0; i < n; i++) mean += segment[i]
  mean /= n || 1
  for (let i = 0; i < n; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    re[i] = (segment[i] - mean) * hann
  }
  fftInPlace(re, im)
  const out = new Float64Array(n / 2 + 1)
  for (let i = 0; i < out.length; i++) out[i] = re[i] * re[i] + im[i] * im[i]
  return out
}

// ------------------------------------------------------- feature extraction

/** Log-spaced frequency bands per channel. */
export const TAP_BAND_COUNT = 20
/** Per channel: the bands, then spectral centroid, then two decay ratios. */
export const FEATURES_PER_CHANNEL = TAP_BAND_COUNT + 3
/** FFT length for a tap (~21 ms at 48 kHz — the impact's resonance). */
export const TAP_FFT_SIZE = 1024
/** How much audio to keep before the localized onset so the attack is inside the window. */
const PRE_ONSET_FRAMES = 32
const MIN_BAND_HZ = 150
const MAX_BAND_HZ = 10000
const EPS = 1e-14

const toDb = (power: number): number => 10 * Math.log10(power + EPS)
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/** Index where a tap's transient starts: first sample above a quarter of
 *  the window's peak. -1 when the window is effectively silent. */
export function localizeOnset(samples: ArrayLike<number>): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
  if (peak < 1e-5) return -1
  const threshold = peak * 0.25
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= threshold) return i
  }
  return -1
}

/** Loudest sample across all channels, in dB (full scale = 0). Absolute
 *  loudness is discarded from the features on purpose (it varies with tap
 *  force), but comparing it across *repeated taps at fixed spots* is how the
 *  microphone's side is found — the near side is consistently louder. */
export function tapPeakDb(channels: ArrayLike<number>[]): number {
  let peak = 0
  for (const samples of channels) {
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
  }
  return toDb(peak * peak)
}

/**
 * Which side the microphone is on, from taps made at the far left and far
 * right edges: the louder side is the mic's. Returns null when the two are
 * too close to call (under MIN_SIDE_DIFFERENCE_DB), so the caller falls
 * back to the model lookup instead of trusting noise.
 */
export const MIN_SIDE_DIFFERENCE_DB = 2
export function detectMicSide(leftDb: number[], rightDb: number[]): 'left' | 'right' | null {
  if (leftDb.length === 0 || rightDb.length === 0) return null
  const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length
  const difference = mean(leftDb) - mean(rightDb)
  if (Math.abs(difference) < MIN_SIDE_DIFFERENCE_DB) return null
  return difference > 0 ? 'left' : 'right'
}

interface ChannelAnalysis {
  features: number[]
  levelDb: number
  onset: number
}

function analyzeChannel(samples: ArrayLike<number>, sampleRate: number): ChannelAnalysis | null {
  const onset = localizeOnset(samples)
  if (onset < 0) return null
  const start = Math.max(0, onset - PRE_ONSET_FRAMES)
  const segment = new Float64Array(TAP_FFT_SIZE)
  for (let i = 0; i < TAP_FFT_SIZE && start + i < samples.length; i++) segment[i] = samples[start + i]

  const power = powerSpectrum(segment)
  const binHz = sampleRate / TAP_FFT_SIZE
  const maxHz = Math.min(MAX_BAND_HZ, (sampleRate / 2) * 0.95)
  const ratio = maxHz / MIN_BAND_HZ

  const bandDb: number[] = []
  for (let band = 0; band < TAP_BAND_COUNT; band++) {
    const lo = MIN_BAND_HZ * Math.pow(ratio, band / TAP_BAND_COUNT)
    const hi = MIN_BAND_HZ * Math.pow(ratio, (band + 1) / TAP_BAND_COUNT)
    const loBin = Math.max(1, Math.floor(lo / binHz))
    const hiBin = Math.max(loBin + 1, Math.ceil(hi / binHz))
    let sum = 0
    for (let bin = loBin; bin < hiBin && bin < power.length; bin++) sum += power[bin]
    bandDb.push(toDb(sum / (hiBin - loBin)))
  }
  const meanDb = bandDb.reduce((a, b) => a + b, 0) / bandDb.length
  // Shape only (loudness varies with tap force); /10 keeps values near unit scale.
  const shape = bandDb.map((db) => (db - meanDb) / 10)

  let weighted = 0
  let total = 0
  for (let bin = 1; bin < power.length; bin++) {
    weighted += bin * binHz * power[bin]
    total += power[bin]
  }
  const centroid = Math.log2(Math.max(weighted / (total + EPS), 50) / 1000)

  const blockEnergy = (from: number): number => {
    let sum = 0
    for (let i = 0; i < 256; i++) sum += segment[from + i] * segment[from + i]
    return sum / 256
  }
  const e0 = blockEnergy(0)
  const decay1 = clamp(toDb(blockEnergy(256)) - toDb(e0), -40, 10) / 10
  const decay2 = clamp(toDb(blockEnergy(512)) - toDb(e0), -40, 10) / 10

  let rmsSum = 0
  for (let i = 0; i < segment.length; i++) rmsSum += segment[i] * segment[i]

  return { features: [...shape, centroid, decay1, decay2], levelDb: toDb(rmsSum / segment.length), onset }
}

/** Lag (in frames) at which `b` best matches `a` — positive means `b`
 *  heard the tap later. First-difference signals emphasize the sharp
 *  attack over low-frequency rumble. */
export function estimateDelay(a: ArrayLike<number>, b: ArrayLike<number>, around: number, maxLag: number): number {
  const length = 384
  const start = Math.max(maxLag + 1, around - PRE_ONSET_FRAMES)
  const end = Math.min(a.length, b.length) - maxLag - 1
  if (end - start < 64) return 0
  const span = Math.min(length, end - start)
  let bestLag = 0
  let bestScore = -Infinity
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let score = 0
    for (let i = start; i < start + span; i++) {
      score += (a[i] - a[i - 1]) * (b[i + lag] - b[i + lag - 1])
    }
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }
  return bestLag
}

/** Same-device delay search range: ~1 ms, plenty for laptop mic arrays. */
const MAX_DELAY_SECONDS = 0.001

/**
 * One tap's feature vector from raw windows of every mic channel.
 * `deviceOf[c]` is which physical device channel `c` belongs to — arrival
 * delays are only meaningful between channels of one device (separate
 * devices have independent clocks and buffering). Returns null when no
 * channel contains a usable transient.
 */
export function extractTapFeatures(
  channels: ArrayLike<number>[],
  deviceOf: number[],
  sampleRate: number
): number[] | null {
  const analyses = channels.map((samples) => analyzeChannel(samples, sampleRate))
  if (analyses.every((analysis) => analysis === null)) return null

  const silent = new Array(FEATURES_PER_CHANNEL).fill(0)
  const features: number[] = []
  for (const analysis of analyses) features.push(...(analysis?.features ?? silent))

  if (channels.length > 1) {
    const levels = analyses.map((analysis) => analysis?.levelDb ?? -140)
    const meanLevel = levels.reduce((a, b) => a + b, 0) / levels.length
    for (const level of levels) features.push(clamp(level - meanLevel, -40, 40) / 10)

    const maxLag = Math.max(1, Math.round(sampleRate * MAX_DELAY_SECONDS))
    for (let c = 0; c < channels.length; c++) {
      const first = deviceOf.indexOf(deviceOf[c])
      if (first === c) continue
      const reference = analyses[first]
      features.push(reference ? estimateDelay(channels[first], channels[c], reference.onset, maxLag) / 16 : 0)
    }
  }
  return features
}

// ----------------------------------------------------- model + classification

/** Averages several feature vectors into one profile. */
export function averageFeatureVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const length = vectors[0].length
  const sums = new Array(length).fill(0)
  for (const vector of vectors) {
    for (let i = 0; i < length; i++) sums[i] += vector[i] ?? 0
  }
  return sums.map((sum) => sum / vectors.length)
}

/** Smallest per-dimension spread trusted — stops a dimension that happened
 *  to be identical across a few calibration taps from becoming infinitely
 *  strict about tiny natural variation. */
const MIN_SCALE = 0.18

/**
 * Builds zone profiles plus a shared per-dimension `scale` (pooled
 * within-zone standard deviation, blended with its own average so a
 * dimension that looked artificially steady across ~6 taps isn't trusted
 * beyond reason). Scaling is what makes distances comparable across
 * feature types (dB shape, delay, level) and lets one absolute threshold
 * mean the same thing for any mic setup.
 */
export function buildModel(tapsByZone: Array<{ zone: HoloZone; taps: number[][] }>): {
  zones: HoloZoneProfile[]
  scale: number[]
} {
  const zones: HoloZoneProfile[] = tapsByZone.map(({ zone, taps }) => ({
    zone,
    features: averageFeatureVectors(taps),
    sampleCount: taps.length
  }))
  const dimension = zones[0]?.features.length ?? 0
  const pooled = new Array(dimension).fill(0)
  let degrees = 0
  tapsByZone.forEach(({ taps }, zoneIndex) => {
    for (const tap of taps) {
      for (let d = 0; d < dimension; d++) {
        const diff = (tap[d] ?? 0) - zones[zoneIndex].features[d]
        pooled[d] += diff * diff
      }
    }
    degrees += Math.max(0, taps.length - 1)
  })
  const std = pooled.map((sum) => Math.sqrt(sum / Math.max(1, degrees)))
  const avgStd = std.reduce((a, b) => a + b, 0) / (std.length || 1)
  const scale = std.map((value) => Math.max(MIN_SCALE, Math.sqrt(0.5 * value * value + 0.5 * avgStd * avgStd)))
  return { zones, scale }
}

/** Root-mean-square z-distance: ~1 for a typical repeat of the same tap. */
export function scaledDistance(a: number[], b: number[], scale: number[]): number {
  const length = Math.min(a.length, b.length, scale.length)
  if (length === 0) return Infinity
  let sum = 0
  for (let i = 0; i < length; i++) {
    const z = (a[i] - b[i]) / scale[i]
    sum += z * z
  }
  return Math.sqrt(sum / length)
}

export type ClassificationReason = 'ok' | 'unrecognized' | 'ambiguous' | 'no-calibration'

export interface ClassificationResult {
  zone: HoloZone | null
  /** Margin of the winner over the runner-up (0..1), not a probability. */
  confidence: number
  reason: ClassificationReason
}

/** A same-zone repeat scores ~1; a different sound (typing, a clap, a
 *  cup set down) scores well beyond this. First-pass value — see docs. */
export const MAX_TRUSTED_DISTANCE = 3.2
/** Best must beat the runner-up by this fraction, else "ambiguous". */
export const MIN_CONFIDENCE_MARGIN = 0.06

export function classifyZone(features: number[], profiles: HoloZoneProfile[], scale: number[]): ClassificationResult {
  if (profiles.length === 0) return { zone: null, confidence: 0, reason: 'no-calibration' }

  const ranked = profiles
    .map((profile) => ({ zone: profile.zone, distance: scaledDistance(features, profile.features, scale) }))
    .sort((a, b) => a.distance - b.distance)
  const [best, runnerUp] = ranked

  if (!(best.distance <= MAX_TRUSTED_DISTANCE)) return { zone: null, confidence: 0, reason: 'unrecognized' }
  if (!runnerUp) return { zone: best.zone, confidence: 1, reason: 'ok' }

  const margin = runnerUp.distance === 0 ? 0 : 1 - best.distance / runnerUp.distance
  if (margin < MIN_CONFIDENCE_MARGIN) return { zone: null, confidence: margin, reason: 'ambiguous' }
  return { zone: best.zone, confidence: Math.min(1, margin), reason: 'ok' }
}

/**
 * Leave-one-out accuracy over the calibration taps themselves: each tap is
 * classified against profiles rebuilt without it. Tells the user, right
 * after calibrating, whether their zones are actually separable on this
 * setup — instead of finding out by tapping and nothing happening.
 */
export function evaluateCalibration(
  tapsByZone: Array<{ zone: HoloZone; taps: number[][] }>,
  scale: number[]
): number {
  let correct = 0
  let total = 0
  for (const { zone, taps } of tapsByZone) {
    if (taps.length < 2) continue
    taps.forEach((tap, index) => {
      const profiles: HoloZoneProfile[] = tapsByZone.map((entry) => {
        const used = entry.zone === zone ? entry.taps.filter((_, i) => i !== index) : entry.taps
        return { zone: entry.zone, features: averageFeatureVectors(used), sampleCount: used.length }
      })
      const ranked = profiles
        .map((profile) => ({ zone: profile.zone, distance: scaledDistance(tap, profile.features, scale) }))
        .sort((a, b) => a.distance - b.distance)
      total++
      if (ranked[0].zone === zone) correct++
    })
  }
  return total === 0 ? 0 : correct / total
}

// ------------------------------------------------------------ onset detection

export interface OnsetDetectorState {
  noiseFloor: number
  /** Whether the previous block was already over the threshold — a tap
   *  fires once on the rising edge, not on every block of its ringing. */
  previousAbove: boolean
}

export function createOnsetDetectorState(initialNoiseFloor = 0): OnsetDetectorState {
  return { noiseFloor: initialNoiseFloor, previousAbove: false }
}

/**
 * Block loudness with the block's own mean (DC offset / slower-than-block
 * drift) removed. Deliberately not a first difference: that weights energy
 * by frequency squared and made soft desk taps — mostly low-frequency
 * thump — barely register against room noise.
 */
export function blockEnergy(samples: ArrayLike<number>): number {
  const n = samples.length
  if (n < 2) return 0
  let mean = 0
  for (let i = 0; i < n; i++) mean += samples[i]
  mean /= n
  let sum = 0
  for (let i = 0; i < n; i++) {
    const d = samples[i] - mean
    sum += d * d
  }
  return sum / n
}

export type HoloSensitivity = 'low' | 'medium' | 'high'

/** How many times louder than the rolling noise floor a block must be. */
export const SENSITIVITY_MULTIPLIER: Record<HoloSensitivity, number> = { low: 30, medium: 12, high: 5 }
/** Floor of the floor, so a dead-silent mic can't fire on a single bit flip
 *  (diff-RMS ≈ 0.001 of full scale). */
const MIN_NOISE_ENERGY = 1e-6
const NOISE_FLOOR_EMA_ALPHA = 0.04
/** Threshold energy a block must exceed right now — also drives the UI meter. */
export function onsetThreshold(state: OnsetDetectorState, sensitivity: HoloSensitivity): number {
  return Math.max(state.noiseFloor, MIN_NOISE_ENERGY) * SENSITIVITY_MULTIPLIER[sensitivity]
}

export function detectOnset(energy: number, state: OnsetDetectorState, sensitivity: HoloSensitivity = 'medium'): boolean {
  // Rising edge across the threshold. (Comparing against the previous
  // block's energy instead missed taps that straddle a block boundary: a
  // slow-rising thump can be 0.9x threshold in one block and 2x in the
  // next, which is under any fixed jump ratio yet plainly a tap.)
  const above = energy > onsetThreshold(state, sensitivity)
  const isOnset = above && !state.previousAbove
  if (!isOnset) {
    state.noiseFloor = state.noiseFloor * (1 - NOISE_FLOOR_EMA_ALPHA) + energy * NOISE_FLOOR_EMA_ALPHA
  }
  state.previousAbove = above
  return isOnset
}
