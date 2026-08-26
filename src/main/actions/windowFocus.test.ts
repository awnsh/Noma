import { describe, expect, it } from 'vitest'
import { focusWindowAndVerify } from './windowFocus'

describe('focusWindowAndVerify', () => {
  it('fails closed for a handle that is not a real window', () => {
    // A made-up number is guaranteed not to be a live window handle.
    // IsWindow() answers false for it — a safe, read-only query, no
    // real window is ever touched — and the function must refuse.
    expect(focusWindowAndVerify(999999999)).toBe(false)
  })

  it('fails closed for the zero handle', () => {
    expect(focusWindowAndVerify(0)).toBe(false)
  })
})
