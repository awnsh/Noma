import type { HoloGates, HoloZone, HoloZoneProfile } from '@shared/types'

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
 *     -> an impact gate on the raw samples (did it decay like something
 *        struck, or keep going like a voice or a cough), applied before
 *        calibration as well as before classification
 *     -> separability-weighted centroid + nearest-neighbour classification,
 *        against bounds measured from the user's own calibration taps
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
/** Per channel: the bands, spectral centroid, two decay ratios, then three
 *  "is this a knock at all" shape features: tail energy 50-100 ms later,
 *  re-excitation (a bounce / second hit), and rise time to the peak. Being
 *  ordinary features, they're standardized by the user's own calibration
 *  taps, so what counts as "knock-like" is learned per person and desk. */
export const FEATURES_PER_CHANNEL = TAP_BAND_COUNT + 6
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

/** Mean energy of `samples[from..to)`, clamped to the array. */
function meanSquare(samples: ArrayLike<number>, from: number, to: number): number {
  let sum = 0
  let n = 0
  for (let i = Math.max(0, from); i < to && i < samples.length; i++) {
    sum += samples[i] * samples[i]
    n++
  }
  return n > 0 ? sum / n : 0
}

/**
 * How a sound evolves over ~100 ms: what separates a knuckle tap (instant
 * peak, fast clean decay, one hit) from an object set down (slower rise,
 * long tail, bounces or scrapes). Values are scaled to roughly unit range.
 */
function envelopeFeatures(samples: ArrayLike<number>, onset: number, sampleRate: number): number[] {
  const frames = (ms: number): number => Math.round((sampleRate * ms) / 1000)
  const measure = (from: number, to: number): number => meanSquare(samples, from, to)

  const head = measure(onset, onset + frames(5))
  const tail = measure(onset + frames(50), onset + frames(100))
  const tailDb = clamp(toDb(tail) - toDb(head), -60, 0) / 20

  // Largest jump in energy between consecutive 8 ms blocks after the initial
  // hit: a clean tap only ever falls; a bounce or second impact rises again.
  const block = frames(8)
  let previous = measure(onset + frames(5), onset + frames(5) + block)
  let bounceDb = 0
  for (let from = onset + frames(5) + block; from < onset + frames(100); from += block) {
    const energy = measure(from, from + block)
    if (energy > head * 1e-3 && previous > 0) bounceDb = Math.max(bounceDb, toDb(energy) - toDb(previous))
    previous = energy
  }

  let peakIndex = onset
  let peak = 0
  for (let i = onset; i < onset + frames(10) && i < samples.length; i++) {
    if (Math.abs(samples[i]) > peak) {
      peak = Math.abs(samples[i])
      peakIndex = i
    }
  }
  const riseMs = ((peakIndex - onset) / sampleRate) * 1000

  return [tailDb, clamp(bounceDb, 0, 30) / 10, Math.log2(1 + riseMs) / 3]
}

/** Level (dB) in each of TAP_BAND_COUNT log-spaced bands from MIN_BAND_HZ to
 *  the mic's usable top. Shared by the per-tap spectral shape and the
 *  voice gate's "is this late sound broadband" measure. */
function logBandLevelsDb(power: Float64Array, sampleRate: number, fftSize: number): number[] {
  const binHz = sampleRate / fftSize
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
  return bandDb
}

// ----------------------------------------------------------- the impact gate

/**
 * "Was that an impact at all?", asked before any zone is considered.
 *
 * Everything that has falsely triggered Holo in real use — a voice, a cough,
 * a sleeve dragging, a hand shifting on the desk — is a sound a person
 * *makes over time*. A knuckle on a desk is not: all of its energy arrives
 * in one collision and nothing replaces it, so from that instant it only
 * ever gets quieter. That is the difference this measures, and it is a
 * difference of physics rather than of timbre, which is why it holds for
 * sounds nobody thought to calibrate against.
 *
 * Two numbers, both ratios (so neither depends on how hard the tap was):
 * how much is left at 45-105 ms, and whether what is left is still falling
 * at 110-180 ms. A cough is loud in both. A tap in a live room can be loud
 * in the first — that is the room ringing, not the person — but never in the
 * second, because a room's tail decays too. Both thresholds come from the
 * user's own calibration taps (see `deriveGates`), so a lively desk in a
 * tiled kitchen sets its own bar rather than being held to a constant that
 * was picked on someone else's furniture.
 */
export interface ImpactCheck {
  /** Energy at 45-105 ms relative to the attack, in dB. */
  sustainDb: number
  /** Energy at 110-180 ms relative to 45-105 ms, in dB. A decaying impact
   *  keeps falling; a driven sound holds roughly level. */
  drivenDb: number
  /** Strongest normalized autocorrelation at a speech pitch in the late
   *  window (0..1). Not part of the accept/reject decision — it only picks
   *  the wording, so "a voice" is never claimed about a cough or a scrape. */
  periodicity: number
}

/** Windows measured from the onset. The first is late enough that a knock is
 *  over; the second is far enough past it to tell a decay from a hold. */
const IMPACT_LATE_FROM_MS = 45
const IMPACT_LATE_TO_MS = 105
const IMPACT_TAIL_FROM_MS = 110
const IMPACT_TAIL_TO_MS = 180
/** Speech's fundamental. Only used for the wording of a rejection. */
const VOICE_MIN_F0_HZ = 70
const VOICE_MAX_F0_HZ = 330
/** f0 is far below 1 kHz, so averaging groups of 4 samples before the lag
 *  search costs nothing and makes it ~16x cheaper. */
const VOICE_DECIMATION = 4
/** Above this, a rejected sound is described to the user as a voice. */
export const VOICE_PERIODICITY = 0.45

/**
 * Rejected only when a sound is loud in *both* windows. Either one alone
 * would throw away real taps: a live room keeps the first one up, and a dead
 * room with a short window can flatter the second. Requiring both is what
 * lets the gate be strict about coughs without being strict about desks.
 */
export function isImpactLike(check: ImpactCheck, gates: HoloGates): boolean {
  return check.sustainDb <= gates.maxSustainDb || check.drivenDb <= gates.maxDrivenDb
}

/** Mean-removed, `factor`x-decimated copy of `samples[from..to)`. */
function decimate(samples: ArrayLike<number>, from: number, to: number, factor: number): Float64Array {
  const length = Math.max(0, Math.floor((to - from) / factor))
  const out = new Float64Array(length)
  let mean = 0
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let j = 0; j < factor; j++) sum += samples[from + i * factor + j]
    out[i] = sum / factor
    mean += out[i]
  }
  mean /= length || 1
  for (let i = 0; i < length; i++) out[i] -= mean
  return out
}

/** Best normalized self-similarity at a speech pitch. Every lag is scored
 *  over the same number of samples, so a long lag cannot win simply by
 *  comparing a shorter, more self-similar stretch. */
function latePeriodicity(samples: ArrayLike<number>, from: number, to: number, sampleRate: number): number {
  const decimated = decimate(samples, from, to, VOICE_DECIMATION)
  const rate = sampleRate / VOICE_DECIMATION
  const minLag = Math.max(2, Math.floor(rate / VOICE_MAX_F0_HZ))
  const maxLag = Math.ceil(rate / VOICE_MIN_F0_HZ)
  const span = decimated.length - maxLag
  if (span < minLag * 2) return 0

  let best = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let dot = 0
    let energyA = 0
    let energyB = 0
    for (let i = 0; i < span; i++) {
      const a = decimated[i]
      const b = decimated[i + lag]
      dot += a * b
      energyA += a * a
      energyB += b * b
    }
    const denominator = Math.sqrt(energyA * energyB)
    if (denominator > EPS) best = Math.max(best, dot / denominator)
  }
  return best
}

/** The impact measures for one channel's window. */
export function measureImpact(samples: ArrayLike<number>, onset: number, sampleRate: number): ImpactCheck {
  const frames = (ms: number): number => Math.round((sampleRate * ms) / 1000)
  const lateFrom = onset + frames(IMPACT_LATE_FROM_MS)
  const lateTo = Math.min(samples.length, onset + frames(IMPACT_LATE_TO_MS))
  const tailFrom = onset + frames(IMPACT_TAIL_FROM_MS)
  const tailTo = Math.min(samples.length, onset + frames(IMPACT_TAIL_TO_MS))

  const head = meanSquare(samples, onset, onset + frames(5))
  const late = meanSquare(samples, lateFrom, lateTo)
  const sustainDb = clamp(toDb(late) - toDb(head), -80, 40)

  // Too little audio past the onset to judge the decay. Reported as "already
  // decayed", which is the safe direction: the gate then never rejects on a
  // measurement it could not actually make.
  const tailShort = tailTo - tailFrom < frames(25)
  const drivenDb = tailShort ? -80 : clamp(toDb(meanSquare(samples, tailFrom, tailTo)) - toDb(late), -80, 40)
  const periodicity = lateTo - lateFrom < frames(20) ? 0 : latePeriodicity(samples, lateFrom, lateTo, sampleRate)

  return { sustainDb, drivenDb, periodicity }
}

/**
 * The most conservative reading across every channel: a sound only counts as
 * sustained/driven when *all* channels say so. Channels of one mic hear
 * nearly the same thing, so this costs almost nothing in rejection power —
 * and it means one odd channel can never suppress a real tap. Null when no
 * channel contains a usable onset.
 */
export function detectImpact(channels: ArrayLike<number>[], sampleRate: number): ImpactCheck | null {
  const checks: ImpactCheck[] = []
  for (const samples of channels) {
    const onset = localizeOnset(samples)
    if (onset >= 0) checks.push(measureImpact(samples, onset, sampleRate))
  }
  if (checks.length === 0) return null
  return {
    sustainDb: Math.min(...checks.map((check) => check.sustainDb)),
    drivenDb: Math.min(...checks.map((check) => check.drivenDb)),
    periodicity: Math.min(...checks.map((check) => check.periodicity))
  }
}

function analyzeChannel(samples: ArrayLike<number>, sampleRate: number): ChannelAnalysis | null {
  const onset = localizeOnset(samples)
  if (onset < 0) return null
  const start = Math.max(0, onset - PRE_ONSET_FRAMES)
  const segment = new Float64Array(TAP_FFT_SIZE)
  for (let i = 0; i < TAP_FFT_SIZE && start + i < samples.length; i++) segment[i] = samples[start + i]

  const power = powerSpectrum(segment)
  const binHz = sampleRate / TAP_FFT_SIZE

  const bandDb = logBandLevelsDb(power, sampleRate, TAP_FFT_SIZE)
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

  const envelope = envelopeFeatures(samples, onset, sampleRate)

  return { features: [...shape, centroid, decay1, decay2, ...envelope], levelDb: toDb(rmsSum / segment.length), onset }
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
/** How far a dimension's weight may be pushed either way. A dimension that
 *  separates zones well is worth more than one that doesn't, but never so
 *  much that the decision rests on a single number. */
const MIN_WEIGHT = 0.3
const MAX_WEIGHT = 3

export interface HoloModel {
  zones: HoloZoneProfile[]
  scale: number[]
  weights: number[]
}

/**
 * Builds zone profiles plus two per-dimension vectors.
 *
 * `scale` (pooled within-zone standard deviation, blended with its own
 * average so a dimension that looked artificially steady across a handful of
 * taps isn't trusted beyond reason) makes distances comparable across
 * feature types — dB shape, delay, level — so one threshold means the same
 * thing on any mic setup.
 *
 * `weights` then asks a second, different question: of those standardized
 * dimensions, which ones actually tell the zones *apart*? A band that varies
 * just as much between two taps on the same spot as it does between spots
 * carries no location information, and averaging it into the distance only
 * adds noise — which is exactly how a tap lands on the wrong zone. Each
 * weight is the spread of the zone means in that dimension divided by the
 * within-zone spread (a Fisher ratio, in already-standardized units),
 * normalized so the average weight is 1 and the overall distance scale is
 * unchanged.
 */
export function buildModel(tapsByZone: Array<{ zone: HoloZone; taps: number[][] }>): HoloModel {
  const zones: HoloZoneProfile[] = tapsByZone.map(({ zone, taps }) => ({
    zone,
    features: averageFeatureVectors(taps),
    taps,
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

  // Spread of the zone means, in units of `scale` — how much of this
  // dimension's variation is between zones rather than within one.
  const separability = new Array(dimension).fill(0)
  for (let d = 0; d < dimension; d++) {
    const means = zones.map((profile) => profile.features[d] ?? 0)
    const mean = means.reduce((a, b) => a + b, 0) / (means.length || 1)
    const variance = means.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / (means.length || 1)
    separability[d] = Math.sqrt(variance) / scale[d]
  }
  const avgSeparability = separability.reduce((a, b) => a + b, 0) / (separability.length || 1)
  const weights =
    avgSeparability > EPS
      ? separability.map((value) => clamp(value / avgSeparability, MIN_WEIGHT, MAX_WEIGHT))
      : new Array(dimension).fill(1)

  return { zones, scale, weights }
}

/** Root-mean-square z-distance: ~1 for a typical repeat of the same tap.
 *  `weights` is optional so the raw standardized distance stays available
 *  (the model builder needs it before any weights exist). */
export function scaledDistance(a: number[], b: number[], scale: number[], weights?: number[]): number {
  const length = Math.min(a.length, b.length, scale.length)
  if (length === 0) return Infinity
  let sum = 0
  for (let i = 0; i < length; i++) {
    const z = ((a[i] - b[i]) / scale[i]) * (weights?.[i] ?? 1)
    sum += z * z
  }
  return Math.sqrt(sum / length)
}

function maxAbsZ(a: number[], b: number[], scale: number[], weights?: number[]): number {
  let max = 0
  const length = Math.min(a.length, b.length, scale.length)
  for (let i = 0; i < length; i++) max = Math.max(max, Math.abs(((a[i] - b[i]) / scale[i]) * (weights?.[i] ?? 1)))
  return max
}

/** How many of a zone's own calibration taps the nearest-neighbour half of
 *  the distance averages over. */
const KNN_NEIGHBOURS = 2
/** How much of the distance comes from the zone's average tap rather than
 *  its nearest individual ones. */
const CENTROID_SHARE = 0.5

/**
 * Distance from a sound to one zone, as half "how far from this zone's
 * average tap" and half "how far from the nearest taps actually recorded
 * there".
 *
 * The average alone assumes every tap on a spot sounds like every other one,
 * which real taps don't: force, knuckle angle and the exact square inch all
 * move the sound, so a zone is a small cloud rather than a point, and a tap
 * at the edge of its own cloud can sit closer to a neighbour's average than
 * to its own. The nearest-neighbour half sees that cloud. Keeping both is
 * deliberate shrinkage — with only a handful of taps per zone, individual
 * neighbours are noisy, and the average is the steadier estimate.
 */
function zoneDistance(features: number[], profile: HoloZoneProfile, scale: number[], weights: number[]): number {
  const centroid = scaledDistance(features, profile.features, scale, weights)
  const taps = profile.taps ?? []
  if (taps.length === 0) return centroid

  const nearest = taps.map((tap) => scaledDistance(features, tap, scale, weights)).sort((a, b) => a - b)
  const k = Math.min(KNN_NEIGHBOURS, nearest.length)
  const knn = nearest.slice(0, k).reduce((a, b) => a + b, 0) / k
  return CENTROID_SHARE * centroid + (1 - CENTROID_SHARE) * knn
}

export type ClassificationReason = 'ok' | 'unrecognized' | 'ambiguous' | 'wrong-level' | 'not-a-tap' | 'voice' | 'no-calibration'

export interface ClassificationResult {
  zone: HoloZone | null
  /** Margin of the winner over the runner-up (0..1), not a probability. */
  confidence: number
  reason: ClassificationReason
}

/** Fallbacks for a calibration saved before gates were measured, and for the
 *  degenerate case of a calibration with nothing to measure from. */
export const DEFAULT_GATES: HoloGates = {
  maxDistance: 2.8,
  maxSingleFeatureZ: 8,
  minMargin: 0.06,
  minPeakDb: -70,
  maxPeakDb: 0,
  maxSustainDb: -20,
  maxDrivenDb: -15
}

/** Headroom over the worst calibration tap. Generous on purpose: a missed
 *  tap is felt immediately and a false one only occasionally, so every bound
 *  sits a clear margin outside what the user actually demonstrated. */
const DISTANCE_HEADROOM = 1.3
const PEAK_ABOVE_MARGIN_DB = 9
const PEAK_BELOW_MARGIN_DB = 10
const IMPACT_MARGIN_DB = 6

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))))]
}

/**
 * Turns the calibration taps into the bounds above. The 90th percentile
 * rather than the maximum, so one bad tap (a slip, a knock on the laptop
 * itself) can't widen every gate; then a margin on top of that.
 */
export function deriveGates(looDistances: number[], peakDbs: number[], impacts: ImpactCheck[]): HoloGates {
  const sustains = impacts.map((impact) => impact.sustainDb)
  const drivens = impacts.map((impact) => impact.drivenDb)
  return {
    maxDistance: looDistances.length
      ? clamp(percentile(looDistances, 0.9) * DISTANCE_HEADROOM, 1.5, 4.5)
      : DEFAULT_GATES.maxDistance,
    maxSingleFeatureZ: DEFAULT_GATES.maxSingleFeatureZ,
    minMargin: DEFAULT_GATES.minMargin,
    minPeakDb: peakDbs.length ? Math.min(...peakDbs) - PEAK_BELOW_MARGIN_DB : DEFAULT_GATES.minPeakDb,
    maxPeakDb: peakDbs.length ? Math.max(...peakDbs) + PEAK_ABOVE_MARGIN_DB : DEFAULT_GATES.maxPeakDb,
    maxSustainDb: sustains.length ? clamp(percentile(sustains, 0.9) + IMPACT_MARGIN_DB, -45, -6) : DEFAULT_GATES.maxSustainDb,
    maxDrivenDb: drivens.length ? clamp(percentile(drivens, 0.9) + IMPACT_MARGIN_DB, -32, -4) : DEFAULT_GATES.maxDrivenDb
  }
}

/**
 * The sensitivity control, applied to the gates as well as to the onset
 * threshold. One knob the user can actually reason about: "Light taps" leans
 * towards firing on anything plausible, "Firm taps" towards only firing on
 * something unmistakable. Which way to lean is a matter of where they are
 * sitting and what else is in the room, so it belongs to them rather than to
 * a constant in here.
 */
export function relaxGates(gates: HoloGates, sensitivity: HoloSensitivity): HoloGates {
  const lean = { low: -1, medium: 0, high: 1 }[sensitivity]
  if (lean === 0) return gates
  return {
    ...gates,
    maxDistance: gates.maxDistance * (1 + 0.15 * lean),
    minMargin: Math.max(0, gates.minMargin - 0.02 * lean),
    minPeakDb: gates.minPeakDb - 4 * lean,
    maxPeakDb: gates.maxPeakDb + 4 * lean,
    maxSustainDb: gates.maxSustainDb + 3 * lean,
    maxDrivenDb: gates.maxDrivenDb + 3 * lean
  }
}

export interface ClassifyOptions {
  weights?: number[]
  gates?: HoloGates
  /** Peak loudness of the sound, for the level bounds. */
  peakDb?: number
  /** Decay measures, for the impact gate. */
  impact?: ImpactCheck
}

export function classifyZone(
  features: number[],
  profiles: HoloZoneProfile[],
  scale: number[],
  options: ClassifyOptions = {}
): ClassificationResult {
  if (profiles.length === 0) return { zone: null, confidence: 0, reason: 'no-calibration' }

  const gates = options.gates ?? DEFAULT_GATES
  const weights = options.weights ?? new Array(scale.length).fill(1)

  if (options.peakDb !== undefined && (options.peakDb > gates.maxPeakDb || options.peakDb < gates.minPeakDb)) {
    return { zone: null, confidence: 0, reason: 'wrong-level' }
  }
  if (options.impact && !isImpactLike(options.impact, gates)) {
    // Named apart only so the user is told something true about what they
    // heard themselves do; both are the same rejection.
    return { zone: null, confidence: 0, reason: options.impact.periodicity > VOICE_PERIODICITY ? 'voice' : 'not-a-tap' }
  }

  const ranked = profiles
    .map((profile) => ({
      zone: profile.zone,
      distance: zoneDistance(features, profile, scale, weights),
      worst: maxAbsZ(features, profile.features, scale, weights)
    }))
    .sort((a, b) => a.distance - b.distance)
  const [best, runnerUp] = ranked

  if (!(best.distance <= gates.maxDistance) || best.worst > gates.maxSingleFeatureZ) {
    return { zone: null, confidence: 0, reason: 'unrecognized' }
  }
  if (!runnerUp) return { zone: best.zone, confidence: 1, reason: 'ok' }

  const margin = runnerUp.distance === 0 ? 0 : 1 - best.distance / runnerUp.distance
  if (margin < gates.minMargin) return { zone: null, confidence: margin, reason: 'ambiguous' }
  return { zone: best.zone, confidence: Math.min(1, margin), reason: 'ok' }
}

export interface CalibrationEvaluation {
  /** Share of the calibration taps that land on their own zone. */
  accuracy: number
  /** Each tap's distance to its own zone with itself held out — the spread
   *  of genuine taps, which is what `deriveGates` turns into `maxDistance`. */
  distances: number[]
}

/**
 * Leave-one-out over the calibration taps themselves: each tap is scored
 * against a model rebuilt without it. Tells the user, right after
 * calibrating, whether their zones are actually separable on this setup —
 * instead of finding out by tapping and nothing happening — and supplies the
 * distance distribution the gates are derived from.
 *
 * `scale` and `weights` are not rebuilt per fold: they are second-order
 * statistics over every tap, so holding one out barely moves them, and
 * recomputing them 30-odd times would buy nothing.
 */
export function evaluateCalibration(
  tapsByZone: Array<{ zone: HoloZone; taps: number[][] }>,
  scale: number[],
  weights?: number[]
): CalibrationEvaluation {
  let correct = 0
  let total = 0
  const distances: number[] = []
  for (const { zone, taps } of tapsByZone) {
    if (taps.length < 2) continue
    taps.forEach((tap, index) => {
      const profiles: HoloZoneProfile[] = tapsByZone.map((entry) => {
        const used = entry.zone === zone ? entry.taps.filter((_, i) => i !== index) : entry.taps
        return { zone: entry.zone, features: averageFeatureVectors(used), taps: used, sampleCount: used.length }
      })
      const ranked = profiles
        .map((profile) => ({ zone: profile.zone, distance: zoneDistance(tap, profile, scale, weights ?? []) }))
        .sort((a, b) => a.distance - b.distance)
      total++
      if (ranked[0].zone === zone) correct++
      const own = ranked.find((entry) => entry.zone === zone)
      if (own) distances.push(own.distance)
    })
  }
  return { accuracy: total === 0 ? 0 : correct / total, distances }
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
