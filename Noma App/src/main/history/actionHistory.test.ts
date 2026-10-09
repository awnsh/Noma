import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseActionLogLine, readActionHistory, summarizeActionHistory } from './actionHistory'

function line(fields: Record<string, unknown>): string {
  return JSON.stringify(fields)
}

describe('parseActionLogLine', () => {
  it('parses a line in the shape logActionResult writes', () => {
    const entry = parseActionLogLine(
      line({ at: '2026-10-01T10:00:00.000Z', control: 'Left', actionType: 'shortcut', ok: false, reason: 'No window' })
    )
    expect(entry).toEqual({
      at: Date.parse('2026-10-01T10:00:00.000Z'),
      control: 'Left',
      controlId: undefined,
      actionType: 'shortcut',
      ok: false,
      reason: 'No window'
    })
  })

  it('keeps a controlId when the line has one', () => {
    const entry = parseActionLogLine(
      line({ at: '2026-10-01T10:00:00.000Z', control: 'Left', controlId: 'c1', actionType: 'macro', ok: true })
    )
    expect(entry?.controlId).toBe('c1')
    expect(entry?.reason).toBeUndefined()
  })

  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['not JSON', 'not json at all'],
    ['torn line', '{"at":"2026-10-01T10:00:00.000Z","control":"Le'],
    ['array', '[1,2,3]'],
    ['null', 'null'],
    ['missing ok', line({ at: '2026-10-01T10:00:00.000Z', control: 'Left' })],
    ['non-boolean ok', line({ at: '2026-10-01T10:00:00.000Z', ok: 'yes' })],
    ['missing at', line({ control: 'Left', ok: true })],
    ['unparseable at', line({ at: 'yesterday', ok: true })]
  ])('returns null for %s', (_name, text) => {
    expect(parseActionLogLine(text)).toBeNull()
  })

  it('fills defaults for missing optional fields', () => {
    const entry = parseActionLogLine(line({ at: '2026-10-01T10:00:00.000Z', ok: true }))
    expect(entry).toMatchObject({ control: '', actionType: 'unknown', ok: true })
  })
})

describe('summarizeActionHistory', () => {
  const at = (minute: number): number => Date.parse(`2026-10-01T10:${String(minute).padStart(2, '0')}:00.000Z`)

  it('returns the newest entries first, limited', () => {
    const entries = [1, 2, 3, 4].map((minute) => ({ at: at(minute), control: `C${minute}`, actionType: 'shortcut', ok: true }))
    const history = summarizeActionHistory(entries, 2)
    expect(history.recent.map((entry) => entry.control)).toEqual(['C4', 'C3'])
    expect(history.total).toBe(4)
  })

  it('counts successes and failures per control and keeps the last result', () => {
    const history = summarizeActionHistory([
      { at: at(1), control: 'Left', actionType: 'macro', ok: true },
      { at: at(2), control: 'Right', actionType: 'shortcut', ok: true },
      { at: at(3), control: 'Left', actionType: 'macro', ok: false, reason: 'Stopped' },
      { at: at(4), control: 'Left', actionType: 'macro', ok: false, reason: 'No window' }
    ])
    expect(history.controls).toEqual([
      {
        key: 'label:Left',
        control: 'Left',
        controlId: undefined,
        actionType: 'macro',
        successCount: 1,
        failureCount: 2,
        lastAt: at(4),
        lastOk: false,
        lastReason: 'No window'
      },
      {
        key: 'label:Right',
        control: 'Right',
        controlId: undefined,
        actionType: 'shortcut',
        successCount: 1,
        failureCount: 0,
        lastAt: at(2),
        lastOk: true
      }
    ])
  })

  it('groups by controlId when present, so a renamed control stays one row', () => {
    const history = summarizeActionHistory([
      { at: at(1), control: 'Old name', controlId: 'c1', actionType: 'macro', ok: true },
      { at: at(2), control: 'New name', controlId: 'c1', actionType: 'macro', ok: true }
    ])
    expect(history.controls).toHaveLength(1)
    expect(history.controls[0]).toMatchObject({ key: 'id:c1', control: 'New name', successCount: 2 })
  })

  it('clears the last reason once the control succeeds again', () => {
    const history = summarizeActionHistory([
      { at: at(1), control: 'Left', actionType: 'macro', ok: false, reason: 'No window' },
      { at: at(2), control: 'Left', actionType: 'macro', ok: true }
    ])
    expect(history.controls[0]).toMatchObject({ lastOk: true, lastReason: undefined, failureCount: 1 })
  })

  it('clamps nonsense limits', () => {
    const entries = [1, 2, 3].map((minute) => ({ at: at(minute), control: 'C', actionType: 'shortcut', ok: true }))
    expect(summarizeActionHistory(entries, 0).recent).toHaveLength(1)
    expect(summarizeActionHistory(entries, -5).recent).toHaveLength(1)
    expect(summarizeActionHistory(entries, Number.NaN).recent).toHaveLength(3)
  })
})

describe('readActionHistory', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'noma-history-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('returns an empty history when the file is missing', async () => {
    expect(await readActionHistory(join(folder, 'actions.jsonl'))).toEqual({ recent: [], controls: [], total: 0 })
  })

  it('returns an empty history when the path is a folder', async () => {
    expect(await readActionHistory(folder)).toEqual({ recent: [], controls: [], total: 0 })
  })

  it('skips malformed lines and reads the rest, including CRLF files', async () => {
    const file = join(folder, 'actions.jsonl')
    writeFileSync(
      file,
      [
        line({ at: '2026-10-01T10:00:00.000Z', control: 'Left', actionType: 'shortcut', ok: true }),
        'garbage',
        '',
        line({ at: '2026-10-01T10:01:00.000Z', control: 'Left', actionType: 'shortcut', ok: false, reason: 'No window' }),
        '{"at":"2026-10-01T10:02:00.000Z","control":"Ri'
      ].join('\r\n')
    )
    const history = await readActionHistory(file)
    expect(history.total).toBe(2)
    expect(history.recent[0]).toMatchObject({ ok: false, reason: 'No window' })
    expect(history.controls).toEqual([
      expect.objectContaining({ control: 'Left', successCount: 1, failureCount: 1, lastOk: false })
    ])
  })
})
