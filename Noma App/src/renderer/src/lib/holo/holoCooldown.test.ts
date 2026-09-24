import { describe, expect, it } from 'vitest'
import { HoloCaptureEngine } from './holoCapture'
import { HOLO_COOLDOWN_MS } from '../../stores/holoStore'

/**
 * The post-press cooldown's public surface only — constructing the engine
 * touches no Web Audio, but anything that starts it does, and jsdom has no
 * Web Audio implementation at all (see holoCapture.ts's own doc comment for
 * why that file is otherwise not unit tested).
 */
describe('post-press cooldown', () => {
  it('is not running until a control actually fires', () => {
    expect(new HoloCaptureEngine().cooldownRemaining).toBe(0)
  })

  it('counts down from the moment a control fired', () => {
    const engine = new HoloCaptureEngine()
    engine.beginCooldown(HOLO_COOLDOWN_MS.normal)
    expect(engine.cooldownRemaining).toBeGreaterThan(0)
    expect(engine.cooldownRemaining).toBeLessThanOrEqual(HOLO_COOLDOWN_MS.normal)
  })

  it('never reports a negative remainder once it has elapsed', () => {
    const engine = new HoloCaptureEngine()
    engine.beginCooldown(-1)
    expect(engine.cooldownRemaining).toBe(0)
  })

  it('is cleared by stopping, so resuming never starts out deaf', () => {
    const engine = new HoloCaptureEngine()
    engine.beginCooldown(HOLO_COOLDOWN_MS.deliberate)
    engine.stop()
    expect(engine.cooldownRemaining).toBe(0)
  })

  it('offers a pace for bursts and a pace for one-shot macros', () => {
    expect(HOLO_COOLDOWN_MS.rapid).toBeLessThan(HOLO_COOLDOWN_MS.normal)
    expect(HOLO_COOLDOWN_MS.normal).toBeLessThan(HOLO_COOLDOWN_MS.deliberate)
    // Every pace has to outlast one tap's own ringing, which is what the
    // separate, much shorter TAP_REFRACTORY_MS already covers.
    expect(HOLO_COOLDOWN_MS.rapid).toBeGreaterThan(220)
  })
})
