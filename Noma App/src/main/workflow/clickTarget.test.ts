import { describe, expect, it } from 'vitest'
import { clickTargetFor, describeClickTarget, sanitizeControlLabel, zoneForClick } from './clickTarget'

const BUTTON = 'ControlType.Button'
const WINDOW = { left: 0, top: 0, right: 1600, bottom: 1000 }

describe('sanitizeControlLabel', () => {
  it('keeps short command labels, cleaning accelerators and ellipses', () => {
    expect(sanitizeControlLabel(BUTTON, 'Delete')).toBe('Delete')
    expect(sanitizeControlLabel(BUTTON, '&Save As...')).toBe('Save As')
    expect(sanitizeControlLabel('ControlType.MenuItem', 'Ripple Delete')).toBe('Ripple Delete')
    // A tab is named after its page in a browser — never kept as a label.
    expect(sanitizeControlLabel('ControlType.TabItem', 'Inbox')).toBeNull()
  })

  it('never records content-bearing control types, whatever their name', () => {
    for (const type of [
      'ControlType.Edit',
      'ControlType.Document',
      'ControlType.ListItem',
      'ControlType.Hyperlink',
      'ControlType.Text',
      'ControlType.DataItem',
      'ControlType.TreeItem'
    ]) {
      expect(sanitizeControlLabel(type, 'Delete')).toBeNull()
    }
  })

  it('rejects names that look like data rather than a label', () => {
    const notLabels = [
      'Report_Q3.xlsx',
      'C:\\Users\\me',
      'https://x.com',
      'a.b@x.com',
      '3 unread',
      'Reply to John about the budget',
      'x'.repeat(40),
      '',
      '   '
    ]
    for (const name of notLabels) {
      expect(sanitizeControlLabel(BUTTON, name)).toBeNull()
    }
    expect(sanitizeControlLabel(BUTTON, null)).toBeNull()
    expect(sanitizeControlLabel(null, 'Delete')).toBeNull()
  })
})

describe('zoneForClick', () => {
  it('maps a point to a window-relative grid cell, independent of where the window is', () => {
    expect(zoneForClick(10, 10, WINDOW)).toBe('zone:0x0')
    expect(zoneForClick(1590, 990, WINDOW)).toBe('zone:15x9')
    const moved = { left: 300, top: 200, right: 1900, bottom: 1200 }
    expect(zoneForClick(310, 210, moved)).toBe('zone:0x0')
  })

  it('returns null outside the window or for a tiny window', () => {
    expect(zoneForClick(2000, 10, WINDOW)).toBeNull()
    expect(zoneForClick(50, 50, { left: 0, top: 0, right: 120, bottom: 80 })).toBeNull()
  })
})

describe('clickTargetFor', () => {
  it('prefers a safe label, falls back to a zone, and can record nothing', () => {
    expect(clickTargetFor(10, 10, { controlType: BUTTON, name: 'Cut', window: WINDOW })).toBe('label:Cut')
    expect(clickTargetFor(10, 10, { controlType: 'ControlType.Pane', name: 'stuff', window: WINDOW })).toBe('zone:0x0')
    expect(clickTargetFor(10, 10, { controlType: null, name: null, window: null })).toBeNull()
  })

  it('records nothing at all for content controls, or for a command control with an unsafe name', () => {
    for (const type of ['ControlType.Edit', 'ControlType.Document', 'ControlType.ListItem', 'ControlType.Hyperlink']) {
      expect(clickTargetFor(10, 10, { controlType: type, name: 'anything', window: WINDOW })).toBeNull()
    }
    expect(clickTargetFor(10, 10, { controlType: BUTTON, name: 'Report_Q3.xlsx', window: WINDOW })).toBeNull()
  })

  it('describes both target kinds in words', () => {
    expect(describeClickTarget('label:Delete')).toBe('“Delete”')
    expect(describeClickTarget('zone:0x0')).toBe('a spot in the top-left')
    expect(describeClickTarget('zone:8x5')).toBe('a spot in the middle')
  })
})
