import { describe, expect, it, vi } from 'vitest'
import { ClickCaptureService, type CapturedClickEvent } from './clickCaptureService'
import type { ClickInspection, ClickInspector } from './uiaInspector'

const WINDOW = { left: 0, top: 0, right: 1600, bottom: 1000 }

function setup(inspection: ClickInspection | null) {
  const events: CapturedClickEvent[] = []
  const inspector: ClickInspector = { inspect: vi.fn().mockResolvedValue(inspection), dispose: vi.fn() }
  const service = new ClickCaptureService((event) => events.push(event), inspector, 999)
  return { events, inspector, service }
}

describe('ClickCaptureService.handlePress', () => {
  it('reports only the sanitized target for a named button', async () => {
    const { events, service } = setup({ controlType: 'ControlType.Button', name: '&Delete', processId: 1, window: WINDOW })
    await service.handlePress(120, 40, 'resolve', 1234)
    expect(events).toEqual([{ applicationId: 'resolve', clickTarget: 'label:Delete', timestamp: 1234 }])
  })

  it('falls back to a coarse zone for an app that exposes no controls', async () => {
    const { events, service } = setup({ controlType: 'ControlType.Pane', name: null, processId: 1, window: WINDOW })
    await service.handlePress(10, 10, 'resolve', 1)
    expect(events[0].clickTarget).toBe('zone:0x0')
  })

  it('never reports clicks in text/document controls, in Flow itself, or with no known app', async () => {
    const doc = setup({ controlType: 'ControlType.Document', name: 'secret notes', processId: 1, window: WINDOW })
    await doc.service.handlePress(10, 10, 'winword', 1)
    expect(doc.events).toEqual([])

    const own = setup({ controlType: 'ControlType.Button', name: 'Delete', processId: 999, window: WINDOW })
    await own.service.handlePress(10, 10, 'resolve', 1)
    expect(own.events).toEqual([])

    const noApp = setup({ controlType: 'ControlType.Button', name: 'Delete', processId: 1, window: WINDOW })
    await noApp.service.handlePress(10, 10, null, 1)
    expect(noApp.events).toEqual([])
    expect(noApp.inspector.inspect).not.toHaveBeenCalled()
  })

  it('skips browsers, chat and meeting apps entirely, without even inspecting', async () => {
    for (const app of ['chrome', 'slack', 'zoom', 'claude']) {
      const { events, inspector, service } = setup({ controlType: 'ControlType.Button', name: 'Delete', processId: 1, window: WINDOW })
      await service.handlePress(10, 10, app, 1)
      expect(events).toEqual([])
      expect(inspector.inspect).not.toHaveBeenCalled()
    }
  })

  it('records nothing when the inspector times out', async () => {
    const { events, service } = setup(null)
    await service.handlePress(10, 10, 'resolve', 1)
    expect(events).toEqual([])
  })
})
