import { describe, expect, it } from 'vitest'
import { edgeSwipeEnabled } from './macEdgeSwipe'

describe('edgeSwipeEnabled', () => {
  it('is on when the system gesture is on', () => {
    expect(edgeSwipeEnabled([3, 3])).toBe(true)
  })

  it('is off only when every domain that has the setting says off', () => {
    expect(edgeSwipeEnabled([0, 0])).toBe(false)
    expect(edgeSwipeEnabled([0, null])).toBe(false)
    expect(edgeSwipeEnabled([0, 3])).toBe(true)
  })

  it('falls back to the macOS default (on) when nothing has been set', () => {
    expect(edgeSwipeEnabled([null, null])).toBe(true)
  })
})
