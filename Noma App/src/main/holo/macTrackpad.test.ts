import { describe, expect, it } from 'vitest'
import { toFrame, type MacTouch } from './macTrackpad'
import { TrackpadGestureDetector } from './trackpadGesture'

function touch(identifier: number, x: number, y: number, state = 5, majorAxis = 10): MacTouch {
  return {
    frame: 0,
    timestamp: 0,
    identifier,
    state,
    fingerId: 2,
    handId: 1,
    normalized: { pos: { x, y }, vel: { x: 0, y: 0 } },
    size: 1,
    pressure: 0,
    angle: 0,
    majorAxis,
    minorAxis: 8
  }
}

describe('toFrame', () => {
  it('flips y so 0 is the top of the pad, like Windows reports', () => {
    const frame = toFrame(3, [touch(1, 0.25, 0.9)])
    expect(frame.device).toBe(3)
    expect(frame.contacts[0]).toMatchObject({ id: 1, tip: true, confident: true, x: 0.25 })
    expect(frame.contacts[0].y).toBeCloseTo(0.1)
  })

  it('counts only fingers touching, not hovering or lifting', () => {
    const frame = toFrame(0, [touch(1, 0.5, 0.5, 4), touch(2, 0.5, 0.5, 3), touch(3, 0.5, 0.5, 6)])
    expect(frame.contacts.map((contact) => contact.tip)).toEqual([true, false, false])
    expect(frame.contactCount).toBe(1)
  })

  it('flags a very large contact as a palm', () => {
    expect(toFrame(0, [touch(1, 0.5, 0.5, 5, 45)]).contacts[0].confident).toBe(false)
  })

  it('clamps positions outside the pad', () => {
    expect(toFrame(0, [touch(1, -0.01, 1.02)]).contacts[0]).toMatchObject({ x: 0, y: 0 })
  })

  it('a finger sliding in from the right edge fires through the shared detector', () => {
    const detector = new TrackpadGestureDetector()
    const events = [0.99, 0.95, 0.9].flatMap((x, step) =>
      detector.frame(toFrame(0, [touch(7, x, 0.8)]), 1000 + step * 30)
    )
    expect(events).toEqual([{ type: 'fire', zone: 'topRight', at: 1060 }])
  })
})
