import { describe, expect, it } from 'vitest'
import { summarizeBetaNumbers, type BetaNumbersInput } from './betaNumbers'

const now = new Date(2026, 9, 15, 12, 0, 0)
const day = (offset: number, hour = 10): Date => new Date(2026, 9, 15 + offset, hour, 0, 0)

function input(overrides: Partial<BetaNumbersInput> = {}): BetaNumbersInput {
  return {
    now,
    eventTimestamps: [],
    earliestEvent: null,
    suggestions: [],
    presses: [],
    isSilentFailure: (reason) => reason === 'Nothing assigned',
    cancelledReason: 'You stopped it',
    ...overrides
  }
}

describe('summarizeBetaNumbers', () => {
  it('reports zeros on a fresh install', () => {
    expect(summarizeBetaNumbers(input())).toEqual([
      'Beta numbers (counts only):',
      '  Days used in the last 14: 0',
      '  Oldest learning data: none',
      '  Suggestions made: 0 (last 7 days: 0)',
      '    saved: 0, not now: 0, dismissed: 0, waiting: 0',
      '  Saved workflow runs: 0',
      '    finished: 0, stopped at a step: 0, stopped by you: 0',
      '  Other control presses: 0 (worked: 0)'
    ])
  })

  it('counts distinct local days from events and presses inside the window', () => {
    const lines = summarizeBetaNumbers(
      input({
        eventTimestamps: [day(0).getTime(), day(0, 15).getTime(), day(-3).getTime(), day(-20).getTime()],
        presses: [{ at: day(-5).toISOString(), actionType: 'shortcut', ok: true }],
        earliestEvent: day(-20).getTime()
      })
    )
    expect(lines[1]).toBe('  Days used in the last 14: 3')
    expect(lines[2]).toBe('  Oldest learning data: 2026-09-25')
  })

  it('splits suggestions by outcome and counts the recent ones', () => {
    const seconds = (date: Date): number => Math.floor(date.getTime() / 1000)
    const lines = summarizeBetaNumbers(
      input({
        suggestions: [
          { status: 'accepted', createdAt: seconds(day(-1)) },
          { status: 'rejected', createdAt: seconds(day(-2)) },
          { status: 'rejected', createdAt: seconds(day(-10)) },
          { status: 'dismissed', createdAt: seconds(day(-10)) },
          { status: 'pending', createdAt: seconds(day(0)) }
        ]
      })
    )
    expect(lines[3]).toBe('  Suggestions made: 5 (last 7 days: 3)')
    expect(lines[4]).toBe('    saved: 1, not now: 2, dismissed: 1, waiting: 1')
  })

  it('separates finished, failed and cancelled runs and ignores empty-zone presses', () => {
    const at = day(-1).toISOString()
    const lines = summarizeBetaNumbers(
      input({
        presses: [
          { at, actionType: 'macro', ok: true },
          { at, actionType: 'macro', ok: true },
          { at, actionType: 'macro', ok: false, reason: 'Stopped at step 3' },
          { at, actionType: 'macro', ok: false, reason: 'You stopped it' },
          { at, actionType: 'shortcut', ok: true },
          { at, actionType: 'shortcut', ok: false, reason: 'No window' },
          { at, actionType: 'shortcut', ok: false, reason: 'Nothing assigned' }
        ]
      })
    )
    expect(lines[5]).toBe('  Saved workflow runs since 2026-10-14: 4')
    expect(lines[6]).toBe('    finished: 2, stopped at a step: 1, stopped by you: 1')
    expect(lines[7]).toBe('  Other control presses: 2 (worked: 1)')
  })
})
