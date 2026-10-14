import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClickCaptureService, type CapturedClickEvent, type Press } from './clickCaptureService'
import type { ClickInspection, ClickInspector } from './uiaInspector'
import { __resetSelectionForTesting, takeHighlight } from './selection'

const WINDOW = { left: 0, top: 0, right: 1600, bottom: 1000 }

function setup(inspection: ClickInspection | null, readTab: () => string | null = () => null) {
  const events: CapturedClickEvent[] = []
  const inspector: ClickInspector = { inspect: vi.fn().mockResolvedValue(inspection), dispose: vi.fn() }
  const service = new ClickCaptureService((event) => events.push(event), inspector, { ownProcessId: 999, readTab })
  return { events, inspector, service }
}

function press(applicationId: string | null, extra: Partial<Press> = {}): Press {
  return { x: 10, y: 10, applicationId, timestamp: 1, ...extra }
}

function on(controlType: string, name: string | null = null): ClickInspection {
  return { controlType, name, processId: 1, window: WINDOW }
}

beforeEach(() => __resetSelectionForTesting())

describe('ClickCaptureService.handlePress', () => {
  it('reports only the sanitized target for a named button', async () => {
    const { events, service } = setup(on('ControlType.Button', '&Delete'))
    await service.handlePress(press('resolve', { x: 120, y: 40, timestamp: 1234 }))
    expect(events).toEqual([{ applicationId: 'resolve', clickTarget: 'label:Delete', timestamp: 1234 }])
  })

  it('falls back to a coarse zone for an app that exposes no controls', async () => {
    const { events, service } = setup(on('ControlType.Pane'))
    await service.handlePress(press('resolve'))
    expect(events[0].clickTarget).toBe('zone:0x0')
  })

  it('never reports a plain click in text/document controls, in Flow itself, or with no known app', async () => {
    const doc = setup(on('ControlType.Document', 'secret notes'))
    await doc.service.handlePress(press('winword'))
    expect(doc.events).toEqual([])

    const own = setup({ ...on('ControlType.Button', 'Delete'), processId: 999 })
    await own.service.handlePress(press('resolve'))
    expect(own.events).toEqual([])

    const noApp = setup(on('ControlType.Button', 'Delete'))
    await noApp.service.handlePress(press(null))
    expect(noApp.events).toEqual([])
    expect(noApp.inspector.inspect).not.toHaveBeenCalled()
  })

  it('skips button clicks in chat, meeting and AI apps', async () => {
    for (const app of ['slack', 'zoom', 'claude']) {
      const { events, service } = setup(on('ControlType.Button', 'Delete'))
      await service.handlePress(press(app))
      expect(events).toEqual([])
    }
  })

  it('records nothing when the inspector times out', async () => {
    const { events, service } = setup(null)
    await service.handlePress(press('resolve'))
    expect(events).toEqual([])
  })
})

describe('highlights', () => {
  it('a drag across text is a highlight, with nothing about the text', async () => {
    const { events, service } = setup(on('ControlType.Document', 'secret notes'))
    await service.handlePress(press('winword', { upX: 300, upY: 12 }))
    expect(events).toEqual([{ applicationId: 'winword', clickTarget: 'select', timestamp: 1 }])
    expect(takeHighlight('winword', 2)).toBe(true)
  })

  it('a drag on a canvas (clips on a timeline) is a highlight, not a zone click', async () => {
    const { events, service } = setup(on('ControlType.Pane'))
    await service.handlePress(press('resolve', { upX: 200, upY: 200 }))
    expect(events.map((event) => event.clickTarget)).toEqual(['select'])
  })

  it('a double-click on text, a Shift/Ctrl+click and picking a list item are highlights', async () => {
    const word = setup(on('ControlType.Text'))
    await word.service.handlePress(press('notepad', { repeatPress: true }))
    const extend = setup(on('ControlType.Pane'))
    await extend.service.handlePress(press('resolve', { extending: true }))
    const item = setup(on('ControlType.ListItem', 'Report_Q3.xlsx'))
    await item.service.handlePress(press('explorer'))
    for (const { events } of [word, extend, item]) expect(events.map((event) => event.clickTarget)).toEqual(['select'])
  })

  it('are noticed even in apps whose buttons are never recorded', async () => {
    const { events, service } = setup(on('ControlType.Document'))
    await service.handlePress(press('slack', { upX: 200, upY: 10 }))
    expect(events.map((event) => event.clickTarget)).toEqual(['select'])
  })

  it('dragging a slider or a button, or a window by its title bar, records nothing', async () => {
    const slider = setup(on('ControlType.Slider', 'Volume'))
    await slider.service.handlePress(press('resolve', { upX: 200, upY: 10 }))
    const button = setup(on('ControlType.Button', 'Delete'))
    await button.service.handlePress(press('resolve', { upX: 200, upY: 10 }))
    const moved = setup(on('ControlType.Pane'))
    await moved.service.handlePress(press('resolve', { upX: 200, upY: 10, windowMoved: true }))
    for (const { events } of [slider, button, moved]) expect(events).toEqual([])
  })

  it("a few pixels of jitter isn't a drag", async () => {
    const { events, service } = setup(on('ControlType.Button', 'Save'))
    await service.handlePress(press('code', { upX: 13, upY: 12 }))
    expect(events.map((event) => event.clickTarget)).toEqual(['label:Save'])
  })
})

describe('browsers', () => {
  it('records named buttons, but never a spot on the page', async () => {
    const button = setup(on('ControlType.Button', 'Compose'))
    await button.service.handlePress(press('chrome'))
    expect(button.events.map((event) => event.clickTarget)).toEqual(['label:Compose'])

    const page = setup(on('ControlType.Pane'))
    await page.service.handlePress(press('chrome'))
    expect(page.events).toEqual([])
  })

  it('a click on a tab records which tab, as its fingerprint only', async () => {
    const { events, service } = setup(on('ControlType.TabItem', 'Inbox (3) - you@example.com'), () => '0123456789abcdef')
    await service.handlePress(press('chrome'))
    expect(events.map((event) => event.clickTarget)).toEqual(['tab:0123456789abcdef'])
  })

  it('a tab whose title cannot be read records nothing', async () => {
    const { events, service } = setup(on('ControlType.TabItem', 'Inbox'), () => null)
    await service.handlePress(press('chrome'))
    expect(events).toEqual([])
  })
})
