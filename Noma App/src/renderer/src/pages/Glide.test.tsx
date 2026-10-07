// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ApplicationProfile, Control, FlowApi } from '@shared/types'
import { Glide } from './Glide'

const CODE = { id: 'code', name: 'Visual Studio Code', processName: 'Code.exe' }

/** A tiny in-memory stand-in for the main process: one profile, saved edits stick. */
function backend(edgeSwipe: { supported: boolean; enabled: boolean } = { supported: false, enabled: false }) {
  let edge = edgeSwipe
  let controls: Control[] = [
    { id: 'c1', slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
    { id: 'c2', slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } },
    { id: 'c3', slot: 3, label: 'TERMINAL', action: { type: 'shortcut', keys: ['Control', '`'] } },
    { id: 'c4', slot: 4, label: 'SEARCH', action: { type: 'shortcut', keys: ['Meta', 'Shift', 'F'] } }
  ]
  const profile = (): ApplicationProfile =>
    ({ id: 'p', applicationId: 'code', name: 'Developer', controls, macroIds: [], moduleRecommendationIds: [] }) as ApplicationProfile
  const flow = new Proxy(
    {
      getActiveContext: vi.fn(async () => ({ application: CODE, profile: profile() })),
      getGlideState: vi.fn(async () => ({
        platformSupported: true,
        enabled: true,
        zoneCount: 4,
        touchpads: 1,
        error: null
      })),
      getFlowStatus: vi.fn(async () => ({ enabled: true })),
      listApplicationProfileSummaries: vi.fn(async () => [{ application: CODE, hasProfile: true }]),
      getProfileForApplication: vi.fn(async () => profile()),
      getHoloTouchCheckLast: vi.fn(async () => null),
      getMacEdgeSwipe: vi.fn(async () => edge),
      setMacEdgeSwipe: vi.fn(async (enabled: boolean) => {
        edge = { ...edge, enabled }
        return edge
      }),
      getMacros: vi.fn(async () => []),
      updateControl: vi.fn(async (_app: string, slot: number, label: string, action: Control['action']) => {
        controls = controls.map((c) => (c.slot === slot ? { ...c, label, action } : c))
        return profile()
      }),
      clearControl: vi.fn(async (_app: string, slot: number) => {
        controls = controls.map((c) => (c.slot === slot ? { ...c, label: '', action: { type: 'none' } } : c))
        return profile()
      })
    } as Record<string, unknown>,
    {
      get: (target, key: string) =>
        key in target ? target[key] : key.startsWith('on') ? vi.fn(() => () => {}) : vi.fn(async () => undefined)
    }
  )
  return flow as unknown as FlowApi
}

beforeEach(() => {
  window.flow = backend()
})

const lowerLeft = () => screen.findByRole('button', { name: /Lower left zone/ })

describe('Glide: editing a zone', () => {
  it('opens the lower-left zone with what is saved, saves a change, and reopens with the new value', async () => {
    render(<Glide />)

    fireEvent.click(await lowerLeft())
    const nameField = await screen.findByDisplayValue('TERMINAL')

    fireEvent.change(nameField, { target: { value: 'TERM2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByDisplayValue('TERM2')).not.toBeInTheDocument())
    expect(window.flow.updateControl).toHaveBeenCalledWith('code', 3, 'TERM2', { type: 'shortcut', keys: ['Control', '`'] })

    // The map shows the saved value, and reopening the zone shows it too.
    const zone = await screen.findByRole('button', { name: /Lower left zone: TERM2/ })
    expect(within(zone).getByText('TERM2')).toBeInTheDocument()
    fireEvent.click(zone)
    expect(await screen.findByDisplayValue('TERM2')).toBeInTheDocument()
  })

  it('clearing a zone empties just that one', async () => {
    render(<Glide />)

    fireEvent.click(await lowerLeft())
    fireEvent.click(await screen.findByRole('button', { name: 'Clear zone' }))

    expect(await screen.findByRole('button', { name: /Lower left zone: nothing yet/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lower right zone: SEARCH/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upper left zone: RUN/ })).toBeInTheDocument()
  })

  it('shows the latest saved value even when the zone changed behind the page', async () => {
    render(<Glide />)
    await lowerLeft() // the page has loaded the profile once

    // Another part of the app (or a suggestion) changes the same zone.
    await window.flow.updateControl('code', 3, 'CHANGED', { type: 'shortcut', keys: ['F12'] })

    fireEvent.click(await lowerLeft())
    expect(await screen.findByDisplayValue('CHANGED')).toBeInTheDocument()
  })

})

describe('Glide: the macOS right-edge swipe', () => {
  it('offers to turn it off on macOS, and says so once it is off', async () => {
    window.flow = backend({ supported: true, enabled: true })
    render(<Glide />)

    fireEvent.click(await screen.findByRole('button', { name: 'Turn it off' }))

    expect(window.flow.setMacEdgeSwipe).toHaveBeenCalledWith(false)
    expect(await screen.findByText(/Turned off/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn back on' })).toBeInTheDocument()
  })

  it('shows nothing when the system gesture is already off, or off macOS', async () => {
    window.flow = backend({ supported: true, enabled: false })
    const { unmount } = render(<Glide />)
    await lowerLeft()
    expect(screen.queryByText(/Notification Center/)).not.toBeInTheDocument()
    unmount()

    window.flow = backend({ supported: false, enabled: false })
    render(<Glide />)
    await lowerLeft()
    expect(screen.queryByText(/Notification Center/)).not.toBeInTheDocument()
    expect(window.flow.setMacEdgeSwipe).not.toHaveBeenCalled()
  })
})
