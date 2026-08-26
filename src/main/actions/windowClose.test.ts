import { describe, expect, it } from 'vitest'
import { closeWindowGracefully } from './windowClose'

describe('closeWindowGracefully', () => {
  it('fails closed for a handle that is not a real window', () => {
    // IsWindow() answers false for a made-up handle — a safe, read-only
    // query — so PostMessage(WM_CLOSE) is never attempted, and no real
    // window is ever touched by this test.
    expect(closeWindowGracefully(999999999)).toBe(false)
  })

  it('fails closed for the zero handle', () => {
    expect(closeWindowGracefully(0)).toBe(false)
  })
})
