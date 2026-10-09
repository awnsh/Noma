import { describe, expect, it } from 'vitest'
import type { ActionHistory, ControlRunStats } from '@shared/types'
import { latestRunFor } from './useActionHistory'

function stats(overrides: Partial<ControlRunStats>): ControlRunStats {
  return {
    key: 'label:Left',
    control: 'Left',
    actionType: 'macro',
    successCount: 0,
    failureCount: 1,
    lastAt: 1,
    lastOk: false,
    lastReason: 'No window',
    ...overrides
  }
}

function history(controls: ControlRunStats[]): ActionHistory {
  return { recent: [], controls, total: controls.length }
}

const assignment = { controlId: 'c1', label: 'Left' }

describe('latestRunFor', () => {
  it('returns null without history', () => {
    expect(latestRunFor(null, [assignment], new Set(['Left']))).toBeNull()
  })

  it('matches by controlId when the log has one, ignoring the label', () => {
    const byId = stats({ key: 'id:c1', controlId: 'c1', control: 'Renamed' })
    expect(latestRunFor(history([byId]), [assignment], new Set())).toBe(byId)
    expect(latestRunFor(history([stats({ key: 'id:c2', controlId: 'c2' })]), [assignment], new Set(['Left']))).toBeNull()
  })

  it('falls back to the label only for unambiguous macro runs', () => {
    const byLabel = stats({})
    expect(latestRunFor(history([byLabel]), [assignment], new Set(['Left']))).toBe(byLabel)
    expect(latestRunFor(history([byLabel]), [assignment], new Set())).toBeNull()
    expect(latestRunFor(history([stats({ actionType: 'shortcut' })]), [assignment], new Set(['Left']))).toBeNull()
  })

  it('picks the most recent run across several controls', () => {
    const older = stats({ key: 'id:c1', controlId: 'c1', lastAt: 1 })
    const newer = stats({ key: 'id:c2', controlId: 'c2', lastAt: 5, lastOk: true })
    const result = latestRunFor(history([older, newer]), [assignment, { controlId: 'c2', label: 'Right' }], new Set())
    expect(result).toBe(newer)
  })
})
