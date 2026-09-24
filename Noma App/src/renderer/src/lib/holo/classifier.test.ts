import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GATES,
  FEATURES_PER_CHANNEL,
  blockEnergy,
  buildModel,
  classifyZone,
  createOnsetDetectorState,
  deriveGates,
  detectImpact,
  detectMicSide,
  detectOnset,
  estimateDelay,
  evaluateCalibration,
  extractTapFeatures,
  isImpactLike,
  localizeOnset,
  measureImpact,
  powerSpectrum,
  relaxGates,
  scaledDistance,
  type ImpactCheck
} from './classifier'
import type { HoloGates, HoloZone } from '@shared/types'

const SAMPLE_RATE = 48000
const WINDOW = 12288

/** Deterministic pseudo-random noise so tests never flake. */
function makeRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296 - 0.5
  }
}

/** A synthetic desk tap: a decaying resonance starting at `onset`. */
function synthTap(opts: { freq: number; decay: number; amp?: number; onset?: number; delay?: number; seed: number }): Float32Array {
  const rng = makeRng(opts.seed)
  const out = new Float32Array(WINDOW)
  const onset = (opts.onset ?? 1000) + (opts.delay ?? 0)
  const freq = opts.freq * (1 + rng() * 0.04)
  for (let i = 0; i < WINDOW; i++) {
    const t = i - onset
    const ring = t >= 0 ? Math.sin((2 * Math.PI * freq * t) / SAMPLE_RATE) * Math.exp(-t / opts.decay) : 0
    out[i] = (opts.amp ?? 0.4) * ring + rng() * 0.002
  }
  return out
}

const ZONE_SOUNDS: Record<HoloZone, { freq: number; decay: number }> = {
  frontLeft: { freq: 400, decay: 500 },
  frontRight: { freq: 1200, decay: 250 },
  rearLeft: { freq: 3000, decay: 120 },
  rearRight: { freq: 700, decay: 900 }
}

function zoneTaps(zone: HoloZone, count: number, seedBase: number): number[][] {
  return Array.from({ length: count }, (_, i) => {
    const sound = ZONE_SOUNDS[zone]
    const features = extractTapFeatures([synthTap({ ...sound, seed: seedBase + i })], [0], SAMPLE_RATE)
    if (!features) throw new Error('synthetic tap had no features')
    return features
  })
}

describe('powerSpectrum', () => {
  it('puts a pure tone in the right bin', () => {
    const n = 1024
    const tone = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 64 * i) / n))
    const spectrum = powerSpectrum(tone)
    const peak = spectrum.indexOf(Math.max(...spectrum))
    expect(peak).toBe(64)
  })
})

describe('localizeOnset', () => {
  it('finds where the transient starts', () => {
    const tap = synthTap({ freq: 800, decay: 300, onset: 1200, seed: 1 })
    expect(Math.abs(localizeOnset(tap) - 1200)).toBeLessThan(80)
  })

  it('reports -1 for silence', () => {
    expect(localizeOnset(new Float32Array(1000))).toBe(-1)
  })
})

describe('extractTapFeatures', () => {
  it('returns null when every channel is silent', () => {
    expect(extractTapFeatures([new Float32Array(WINDOW)], [0], SAMPLE_RATE)).toBeNull()
  })

  it('has a fixed per-channel size, plus level features for extra channels', () => {
    const tap = synthTap({ freq: 800, decay: 300, seed: 2 })
    expect(extractTapFeatures([tap], [0], SAMPLE_RATE)).toHaveLength(FEATURES_PER_CHANNEL)
    // 2 channels of one device: 2x channel features + 2 levels + 1 delay
    expect(extractTapFeatures([tap, tap], [0, 0], SAMPLE_RATE)).toHaveLength(FEATURES_PER_CHANNEL * 2 + 3)
    // 2 devices: no cross-device delay
    expect(extractTapFeatures([tap, tap], [0, 1], SAMPLE_RATE)).toHaveLength(FEATURES_PER_CHANNEL * 2 + 2)
  })

  it('is stable across repeats of one sound but differs between sounds', () => {
    const a1 = extractTapFeatures([synthTap({ ...ZONE_SOUNDS.frontLeft, seed: 3 })], [0], SAMPLE_RATE)!
    const a2 = extractTapFeatures([synthTap({ ...ZONE_SOUNDS.frontLeft, seed: 4 })], [0], SAMPLE_RATE)!
    const b = extractTapFeatures([synthTap({ ...ZONE_SOUNDS.rearLeft, seed: 5 })], [0], SAMPLE_RATE)!
    const flat = new Array(a1.length).fill(0.3)
    expect(scaledDistance(a1, a2, flat)).toBeLessThan(scaledDistance(a1, b, flat))
  })

  it('is independent of tap loudness', () => {
    const loud = extractTapFeatures([synthTap({ ...ZONE_SOUNDS.frontRight, amp: 0.6, seed: 6 })], [0], SAMPLE_RATE)!
    const soft = extractTapFeatures([synthTap({ ...ZONE_SOUNDS.frontRight, amp: 0.2, seed: 6 })], [0], SAMPLE_RATE)!
    const flat = new Array(loud.length).fill(0.3)
    expect(scaledDistance(loud, soft, flat)).toBeLessThan(1.5)
  })
})

describe('estimateDelay', () => {
  it('reports how much later the second channel heard the tap', () => {
    const early = synthTap({ freq: 900, decay: 200, seed: 7 })
    const late = synthTap({ freq: 900, decay: 200, seed: 7, delay: 12 })
    expect(estimateDelay(early, late, 1000, 48)).toBe(12)
    expect(estimateDelay(late, early, 1012, 48)).toBe(-12)
  })
})

describe('classification', () => {
  const zones = Object.keys(ZONE_SOUNDS) as HoloZone[]
  const training = zones.map((zone, index) => ({ zone, taps: zoneTaps(zone, 8, 100 + index * 50) }))
  const { zones: profiles, scale } = buildModel(training)

  it('builds one profile per zone and a scale per dimension', () => {
    expect(profiles).toHaveLength(4)
    expect(scale).toHaveLength(FEATURES_PER_CHANNEL)
    expect(scale.every((value) => value > 0)).toBe(true)
  })

  it('classifies fresh taps into the right zone', () => {
    for (const zone of zones) {
      const [tap] = zoneTaps(zone, 1, 9000 + zones.indexOf(zone))
      const result = classifyZone(tap, profiles, scale)
      expect(result.zone).toBe(zone)
      expect(result.reason).toBe('ok')
    }
  })

  it('rejects a sound unlike any calibrated tap', () => {
    // A sustained, broadband hiss — nothing like a decaying knock.
    const rng = makeRng(77)
    const hiss = new Float32Array(WINDOW)
    for (let i = 1000; i < WINDOW; i++) hiss[i] = rng() * 0.6
    const features = extractTapFeatures([hiss], [0], SAMPLE_RATE)!
    expect(classifyZone(features, profiles, scale).zone).toBeNull()
  })

  it('reports no-calibration with no profiles', () => {
    expect(classifyZone([0], [], []).reason).toBe('no-calibration')
  })

  it('scores well-separated calibration taps as highly accurate', () => {
    expect(evaluateCalibration(training, scale).accuracy).toBeGreaterThan(0.9)
  })

  it('scores identical zones as poorly separable', () => {
    const same = zones.map((zone, index) => ({ zone, taps: zoneTaps('frontLeft', 8, 500 + index * 50) }))
    const model = buildModel(same)
    expect(evaluateCalibration(same, model.scale).accuracy).toBeLessThan(0.6)
  })
})

describe('onset detector', () => {
  it('ignores DC offset and keeps low-frequency thumps', () => {
    expect(blockEnergy(new Array(512).fill(0.5))).toBeLessThan(1e-3)
    const thump = Array.from({ length: 512 }, (_, i) => 0.3 * Math.sin((2 * Math.PI * 200 * i) / 48000))
    expect(blockEnergy(thump)).toBeGreaterThan(1e-4)
  })

  it('catches a tap that rises across two blocks (under a fixed jump ratio)', () => {
    const state = createOnsetDetectorState()
    for (let i = 0; i < 100; i++) detectOnset(2e-6, state)
    expect(detectOnset(2e-5, state)).toBe(false) // just under threshold
    expect(detectOnset(4.4e-5, state)).toBe(true) // only 2.2x the block before
  })

  it('fires on a sudden loud block over a quiet room and not on steady noise', () => {
    const state = createOnsetDetectorState()
    for (let i = 0; i < 100; i++) expect(detectOnset(2e-6, state)).toBe(false)
    expect(detectOnset(2e-3, state)).toBe(true)
  })

  it('does not retrigger on a sustained loud sound (needs a fresh rise)', () => {
    const state = createOnsetDetectorState()
    for (let i = 0; i < 50; i++) detectOnset(2e-6, state)
    expect(detectOnset(2e-3, state)).toBe(true)
    expect(detectOnset(1.5e-3, state)).toBe(false)
  })

  it('is more sensitive at "high" than "low"', () => {
    const low = createOnsetDetectorState()
    const high = createOnsetDetectorState()
    for (let i = 0; i < 100; i++) {
      detectOnset(1e-6, low)
      detectOnset(1e-6, high)
    }
    expect(detectOnset(1e-5, low, 'low')).toBe(false)
    expect(detectOnset(1e-5, high, 'high')).toBe(true)
  })
})

describe('detectMicSide', () => {
  it('picks the louder side', () => {
    expect(detectMicSide([-10, -11, -9], [-20, -19, -21])).toBe('left')
    expect(detectMicSide([-22, -20], [-9, -10])).toBe('right')
  })

  it('refuses to guess when the sides are too close', () => {
    expect(detectMicSide([-15, -14], [-15, -15])).toBeNull()
    expect(detectMicSide([], [-10])).toBeNull()
  })
})

describe('separability weighting', () => {
  const zones = Object.keys(ZONE_SOUNDS) as HoloZone[]
  const training = zones.map((zone, index) => ({ zone, taps: zoneTaps(zone, 8, 100 + index * 50) }))

  it('weights a dimension by how much it separates zones, not by how much it varies', () => {
    // Dimension 0 differs between zones and is steady within one; dimension 1
    // is pure noise of the same size. Standardizing alone can't tell them
    // apart — both have the same spread — but only the first says anything
    // about where the tap was.
    const rng = makeRng(31)
    const noisy = zones.map((zone, index) => ({
      zone,
      taps: Array.from({ length: 8 }, () => [index * 0.6 + rng() * 0.2, rng() * 0.6])
    }))
    const { weights } = buildModel(noisy)
    expect(weights[0]).toBeGreaterThan(weights[1] * 2)
  })

  it('gives every dimension the same weight when none of them separates the zones', () => {
    const flat = zones.map((zone) => ({ zone, taps: [[0.2, 0.4], [-0.2, -0.4]] }))
    expect(buildModel(flat).weights).toEqual([1, 1])
  })

  it('pulls a tap onto the right zone when an uninformative dimension would have swamped it', () => {
    // One dimension carries the zone (0 vs 1, steady within a zone). Four
    // carry nothing: they swing +/-0.5 tap to tap, and their zone averages
    // differ only by the luck of a handful of samples. The tap's tone is
    // plainly zone B's, but its four meaningless dimensions all landed on
    // zone A's side — which is exactly the shape of a real-world mix-up,
    // because four weak wrong votes outvote one strong right one.
    const rng = makeRng(41)
    const cluster = (tone: number, drift: number): number[][] =>
      Array.from({ length: 8 }, () => [tone + rng() * 0.04, ...Array.from({ length: 4 }, () => drift + rng())])
    const training2 = [
      { zone: 'frontLeft' as HoloZone, taps: cluster(0, 0.25) },
      { zone: 'frontRight' as HoloZone, taps: cluster(1, -0.25) }
    ]
    const model = buildModel(training2)
    const tap = [0.8, 0.8, 0.8, 0.8, 0.8]

    expect(classifyZone(tap, model.zones, model.scale).zone).toBe('frontLeft') // wrong
    expect(classifyZone(tap, model.zones, model.scale, { weights: model.weights }).zone).toBe('frontRight')
  })

  it('reports leave-one-out accuracy and the spread of genuine taps', () => {
    const { scale, weights } = buildModel(training)
    const { accuracy, distances } = evaluateCalibration(training, scale, weights)
    expect(accuracy).toBeGreaterThan(0.9)
    expect(distances).toHaveLength(32)
    expect(distances.every((distance) => distance > 0 && Number.isFinite(distance))).toBe(true)
  })
})

describe('gates derived from the calibration taps', () => {
  const impacts = (sustain: number, driven: number, count = 8): ImpactCheck[] =>
    Array.from({ length: count }, () => ({ sustainDb: sustain, drivenDb: driven, periodicity: 0.1 }))

  it('sets every bound from the taps the user actually made', () => {
    const gates = deriveGates([1.0, 1.1, 1.2, 1.3], [-24, -20, -16], impacts(-38, -26))
    expect(gates.maxDistance).toBeGreaterThan(1.3)
    expect(gates.minPeakDb).toBeLessThan(-24)
    expect(gates.maxPeakDb).toBeGreaterThan(-16)
    expect(gates.maxSustainDb).toBeCloseTo(-32, 5)
    expect(gates.maxDrivenDb).toBeCloseTo(-20, 5)
  })

  it('lets a live room set a looser bar than a dead one', () => {
    const dead = deriveGates([1], [-20], impacts(-40, -30))
    const live = deriveGates([1], [-20], impacts(-16, -12))
    expect(live.maxSustainDb).toBeGreaterThan(dead.maxSustainDb)
    expect(live.maxDrivenDb).toBeGreaterThan(dead.maxDrivenDb)
  })

  it('ignores one stray tap rather than widening every bound around it', () => {
    const clean = deriveGates([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [-20], impacts(-40, -30))
    const withStray = deriveGates([1, 1, 1, 1, 1, 1, 1, 1, 1, 9], [-20], impacts(-40, -30))
    expect(withStray.maxDistance).toBeCloseTo(clean.maxDistance, 5)
  })

  it('falls back to the defaults when there is nothing to measure', () => {
    expect(deriveGates([], [], [])).toEqual(DEFAULT_GATES)
  })

  it('leans permissive on "light taps" and strict on "firm taps"', () => {
    const base = deriveGates([1.2], [-20], impacts(-38, -26))
    const light = relaxGates(base, 'high')
    const firm = relaxGates(base, 'low')
    expect(light.maxDistance).toBeGreaterThan(base.maxDistance)
    expect(light.minPeakDb).toBeLessThan(base.minPeakDb)
    expect(light.maxSustainDb).toBeGreaterThan(base.maxSustainDb)
    expect(firm.maxDistance).toBeLessThan(base.maxDistance)
    expect(firm.minPeakDb).toBeGreaterThan(base.minPeakDb)
    expect(relaxGates(base, 'medium')).toEqual(base)
  })
})

describe('the impact gate (coughs, voices, things that keep going)', () => {
  const zones = Object.keys(ZONE_SOUNDS) as HoloZone[]
  const training = zones.map((zone, index) => ({ zone, taps: zoneTaps(zone, 8, 100 + index * 50) }))
  const { zones: profiles, scale } = buildModel(training)
  const ONSET = 1000

  /** A cough: an explosive burst, then a couple of hundred milliseconds of
   *  turbulent airflow that decays far too slowly for a struck object. */
  function cough(seed: number): Float32Array {
    const rng = makeRng(seed)
    const out = new Float32Array(WINDOW)
    for (let i = 0; i < WINDOW; i++) {
      const t = i - ONSET
      if (t < 0) {
        out[i] = rng() * 0.002
        continue
      }
      const burst = Math.exp(-t / 600)
      const airflow = 0.45 * Math.exp(-t / 9000)
      out[i] = 0.5 * (burst + airflow) * rng() * 2
    }
    return out
  }

  /** A spoken syllable: harmonics of f0 shaped by formants, held throughout. */
  function vowel(f0: number, seed: number): Float32Array {
    const rng = makeRng(seed)
    const out = new Float32Array(WINDOW)
    const formantGain = (hz: number): number =>
      [500, 1500, 2600].reduce((gain, f) => gain + 1 / (1 + Math.pow((hz - f) / 200, 2)), 0.05)
    for (let i = 0; i < WINDOW; i++) {
      const t = i - ONSET
      if (t < 0) {
        out[i] = rng() * 0.002
        continue
      }
      let sample = 0
      for (let h = 1; h * f0 < 4500; h++) {
        sample += (formantGain(h * f0) / Math.sqrt(h)) * Math.sin((2 * Math.PI * h * f0 * t) / SAMPLE_RATE + h * 1.7)
      }
      out[i] = 0.12 * Math.min(1, t / 400) * sample + rng() * 0.003
    }
    return out
  }

  /** A real tap in a room with an audible tail — still an impact: everything
   *  after the strike, room included, only ever gets quieter. */
  function reverbTap(seed: number): Float32Array {
    const rng = makeRng(seed)
    const out = new Float32Array(WINDOW)
    for (let i = 0; i < WINDOW; i++) {
      const t = i - ONSET
      if (t < 0) {
        out[i] = rng() * 0.002
        continue
      }
      const direct = Math.sin((2 * Math.PI * 900 * t) / SAMPLE_RATE) * Math.exp(-t / 300)
      out[i] = 0.4 * (direct + 0.3 * rng() * 2 * Math.exp(-t / 2600))
    }
    return out
  }

  const impactOf = (signal: Float32Array): ImpactCheck => detectImpact([signal], SAMPLE_RATE)!

  it('rejects a cough, which is loud long after any tap has died away', () => {
    const impact = impactOf(cough(21))
    expect(isImpactLike(impact, DEFAULT_GATES)).toBe(false)
    const result = classifyZone([], profiles, scale, { impact })
    expect(result.zone).toBeNull()
    expect(result.reason).toBe('not-a-tap') // a cough isn't pitched, so it isn't called a voice
  })

  it('rejects speech and says so in those words', () => {
    for (const f0 of [110, 200, 300]) {
      const impact = impactOf(vowel(f0, f0))
      expect(isImpactLike(impact, DEFAULT_GATES)).toBe(false)
      expect(classifyZone([], profiles, scale, { impact }).reason).toBe('voice')
    }
  })

  it('accepts every calibrated zone tap', () => {
    for (const [zone, sound] of Object.entries(ZONE_SOUNDS)) {
      const impact = impactOf(synthTap({ ...sound, seed: 4200 }))
      expect(isImpactLike(impact, DEFAULT_GATES), zone).toBe(true)
    }
  })

  it('accepts a tap whose room tail is still audible, because the tail decays too', () => {
    const impact = impactOf(reverbTap(22))
    expect(impact.drivenDb).toBeLessThan(0) // still falling…
    expect(isImpactLike(impact, DEFAULT_GATES)).toBe(true)
  })

  it('keeps accepting taps in a room lively enough to need its own bounds', () => {
    const live = Array.from({ length: 6 }, (_, i) => impactOf(reverbTap(30 + i)))
    const gates = deriveGates([1.2], [-20], live)
    for (const impact of live) expect(isImpactLike(impact, gates)).toBe(true)
    // …and a cough is still a cough there.
    expect(isImpactLike(impactOf(cough(23)), gates)).toBe(false)
  })

  it('never rejects on a measurement it could not make', () => {
    // A window that ends before the tail could be looked at: the decay is
    // reported as "already gone", so the gate stays out of the way.
    const short = synthTap({ freq: 800, decay: 200, seed: 24 }).slice(0, ONSET + 3000)
    expect(measureImpact(short, ONSET, SAMPLE_RATE).drivenDb).toBeLessThan(DEFAULT_GATES.maxDrivenDb)
  })

  it('returns null when no channel has a usable onset', () => {
    expect(detectImpact([new Float32Array(WINDOW)], SAMPLE_RATE)).toBeNull()
  })

  it('only treats a sound as sustained when every channel agrees', () => {
    const speech = vowel(150, 25)
    const tap = synthTap({ ...ZONE_SOUNDS.frontRight, seed: 26 })
    expect(isImpactLike(detectImpact([speech, speech], SAMPLE_RATE)!, DEFAULT_GATES)).toBe(false)
    expect(isImpactLike(detectImpact([speech, tap], SAMPLE_RATE)!, DEFAULT_GATES)).toBe(true)
  })
})

describe('rejecting non-taps (objects set down, and the level bounds)', () => {
  const zones = Object.keys(ZONE_SOUNDS) as HoloZone[]
  const training = zones.map((zone, index) => ({ zone, taps: zoneTaps(zone, 8, 100 + index * 50) }))
  const { zones: profiles, scale, weights } = buildModel(training)

  /** Same tone as a real zone, but with a slow rise, a long ring, and a bounce. */
  function setDown(seed: number): Float32Array {
    const rng = makeRng(seed)
    const out = new Float32Array(WINDOW)
    const onset = 1000
    for (let i = 0; i < WINDOW; i++) {
      const t = i - onset
      const rise = t < 0 ? 0 : Math.min(1, t / 700)
      const main = t >= 0 ? rise * Math.exp(-t / 3500) : 0
      const bounce = t > 2200 ? 0.7 * Math.exp(-(t - 2200) / 1500) : 0
      out[i] = 0.4 * (main + bounce) * Math.sin((2 * Math.PI * 400 * i) / SAMPLE_RATE) + rng() * 0.002
    }
    return out
  }

  it('rejects a slow, ringing, bouncing sound even when its tone matches a zone', () => {
    const features = extractTapFeatures([setDown(1)], [0], SAMPLE_RATE)!
    expect(classifyZone(features, profiles, scale, { weights }).zone).toBeNull()
  })

  it('still accepts a real tap with the same gates active', () => {
    const [tap] = zoneTaps('frontLeft', 1, 7777)
    expect(classifyZone(tap, profiles, scale, { weights }).zone).toBe('frontLeft')
  })

  it('rejects a sound far louder or softer than the calibration taps', () => {
    const [tap] = zoneTaps('frontLeft', 1, 7778)
    const gates: HoloGates = { ...DEFAULT_GATES, minPeakDb: -30, maxPeakDb: -1 }
    expect(classifyZone(tap, profiles, scale, { weights, gates, peakDb: -15 }).zone).toBe('frontLeft')
    expect(classifyZone(tap, profiles, scale, { weights, gates, peakDb: 2 }).reason).toBe('wrong-level')
    expect(classifyZone(tap, profiles, scale, { weights, gates, peakDb: -45 }).reason).toBe('wrong-level')
  })
})
