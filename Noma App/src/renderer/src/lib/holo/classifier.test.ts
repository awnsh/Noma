import { describe, expect, it } from 'vitest'
import {
  averageFeatureVectors,
  classifyZone,
  computeRms,
  createOnsetDetectorState,
  detectOnset,
  euclideanDistance,
  extractFeatures
} from './classifier'
import type { HoloZoneProfile } from '@shared/types'

describe('computeRms', () => {
  it('is 0 for silence', () => {
    expect(computeRms([0, 0, 0, 0])).toBe(0)
  })

  it('is 0 for an empty buffer', () => {
    expect(computeRms([])).toBe(0)
  })

  it('is the root-mean-square of the samples', () => {
    expect(computeRms([1, -1, 1, -1])).toBeCloseTo(1)
  })

  it('scales with amplitude', () => {
    expect(computeRms([2, -2, 2, -2])).toBeGreaterThan(computeRms([1, -1, 1, -1]))
  })
})

describe('extractFeatures', () => {
  it('returns a zero vector for an empty spectrum', () => {
    expect(extractFeatures([], 4)).toEqual([0, 0, 0, 0])
  })

  it('normalizes so the loudest band is always 1', () => {
    const features = extractFeatures([10, 20, 30, 200], 4)
    expect(Math.max(...features)).toBe(1)
  })

  it('produces the same shape regardless of overall loudness (normalized by peak)', () => {
    const quiet = extractFeatures([10, 20, 30, 40], 4)
    const loud = extractFeatures([100, 200, 300, 400], 4)
    quiet.forEach((value, i) => expect(value).toBeCloseTo(loud[i]))
  })

  it('produces a different shape for a different spectral distribution', () => {
    const lowHeavy = extractFeatures([100, 10, 10, 10], 4)
    const highHeavy = extractFeatures([10, 10, 10, 100], 4)
    expect(lowHeavy).not.toEqual(highHeavy)
  })
})

describe('averageFeatureVectors', () => {
  it('averages several vectors element-wise', () => {
    expect(averageFeatureVectors([[0, 0], [2, 4], [4, 8]])).toEqual([2, 4])
  })

  it('returns an empty array for no input', () => {
    expect(averageFeatureVectors([])).toEqual([])
  })
})

describe('euclideanDistance', () => {
  it('is 0 for identical vectors', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })

  it('matches the textbook formula for a simple case', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5)
  })
})

describe('classifyZone', () => {
  const profiles: HoloZoneProfile[] = [
    { zone: 'frontLeft', features: [1, 0, 0, 0], sampleCount: 6 },
    { zone: 'frontRight', features: [0, 1, 0, 0], sampleCount: 6 },
    { zone: 'rearLeft', features: [0, 0, 1, 0], sampleCount: 6 },
    { zone: 'rearRight', features: [0, 0, 0, 1], sampleCount: 6 }
  ]

  it('returns null with zero confidence when there are no calibrated zones', () => {
    expect(classifyZone([1, 0, 0, 0], [])).toEqual({ zone: null, confidence: 0 })
  })

  it('picks the nearest zone for a clean, unambiguous match', () => {
    const result = classifyZone([0.95, 0.05, 0, 0], profiles)
    expect(result.zone).toBe('frontLeft')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('returns null for a tap that is ambiguous between two zones', () => {
    // Exactly equidistant between frontLeft and frontRight — no honest
    // margin exists, so this must not confidently pick either one.
    const result = classifyZone([0.5, 0.5, 0, 0], profiles)
    expect(result.zone).toBeNull()
  })

  it('reports zero confidence (but still a best guess) with only one calibrated zone', () => {
    const result = classifyZone([0.7, 0.3, 0, 0], [profiles[0]])
    expect(result.zone).toBe('frontLeft')
    expect(result.confidence).toBe(0)
  })

  it('rejects a sound that does not resemble any calibrated zone closely enough', () => {
    // Every calibrated zone is a single-band "spike"; this input is spread
    // evenly across all four bands, meaningfully far from all of them —
    // e.g. a keyboard clack or other sound with a genuinely different
    // spectral shape than a desk tap, with no reject reference supplied.
    const result = classifyZone([0.5, 0.5, 0.5, 0.5], profiles)
    expect(result.zone).toBeNull()
  })

  it('does not reject a genuinely close match just for being imperfect', () => {
    const result = classifyZone([0.85, 0.15, 0, 0], profiles)
    expect(result.zone).toBe('frontLeft')
  })

  describe('with a reject reference (typing/ambient sounds)', () => {
    // A keyboard clack's spectral shape, deliberately similar to
    // frontRight's own profile — modeling the exact failure this reference
    // is meant to fix: a non-tap sound that would otherwise be the
    // *closest* match to a real zone purely by chance.
    const keyboardClack = [0.05, 0.9, 0.05, 0]

    it('rejects a sound that matches the reject reference better than any zone', () => {
      const result = classifyZone(keyboardClack, profiles, [0.1, 0.85, 0.1, 0])
      expect(result.zone).toBeNull()
    })

    it('still recognizes a real, distinct tap with a reject reference present', () => {
      const result = classifyZone([0.95, 0.05, 0, 0], profiles, [0.1, 0.85, 0.1, 0])
      expect(result.zone).toBe('frontLeft')
    })
  })
})

describe('detectOnset', () => {
  it('does not fire on steady low-level noise, and the noise floor tracks it', () => {
    const state = createOnsetDetectorState()
    let firedAny = false
    for (let i = 0; i < 50; i++) {
      if (detectOnset(0.02, state)) firedAny = true
    }
    expect(firedAny).toBe(false)
    expect(state.noiseFloor).toBeGreaterThan(0)
  })

  it('fires on a sudden loud spike well above the learned noise floor', () => {
    const state = createOnsetDetectorState()
    for (let i = 0; i < 30; i++) detectOnset(0.02, state)
    expect(detectOnset(0.5, state)).toBe(true)
  })

  it('a real onset does not corrupt the noise floor upward', () => {
    const state = createOnsetDetectorState()
    for (let i = 0; i < 30; i++) detectOnset(0.02, state)
    const floorBefore = state.noiseFloor
    detectOnset(0.5, state)
    expect(state.noiseFloor).toBe(floorBefore)
  })
})
