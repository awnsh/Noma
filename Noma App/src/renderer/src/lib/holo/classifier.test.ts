import { describe, expect, it } from 'vitest'
import {
  FEATURES_PER_CHANNEL,
  blockEnergy,
  buildModel,
  classifyZone,
  createOnsetDetectorState,
  detectMicSide,
  detectOnset,
  estimateDelay,
  evaluateCalibration,
  extractTapFeatures,
  localizeOnset,
  powerSpectrum,
  scaledDistance
} from './classifier'
import type { HoloZone } from '@shared/types'

const SAMPLE_RATE = 48000
const WINDOW = 3072

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
    expect(evaluateCalibration(training, scale)).toBeGreaterThan(0.9)
  })

  it('scores identical zones as poorly separable', () => {
    const same = zones.map((zone, index) => ({ zone, taps: zoneTaps('frontLeft', 8, 500 + index * 50) }))
    const model = buildModel(same)
    expect(evaluateCalibration(same, model.scale)).toBeLessThan(0.6)
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
