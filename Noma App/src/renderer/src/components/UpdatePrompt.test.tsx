// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { UpdateStatus } from '@shared/types'
import { UpdatePrompt } from './UpdatePrompt'

const BASE: UpdateStatus = { phase: 'idle', currentVersion: '0.1.19', version: null, percent: null, lastCheckedAt: null }

function stubFlow(initial: UpdateStatus) {
  let push: (status: UpdateStatus) => void = () => {}
  const api = {
    getUpdateStatus: vi.fn().mockResolvedValue(initial),
    onUpdateStatus: vi.fn((callback: (status: UpdateStatus) => void) => {
      push = callback
      return () => {}
    }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    openUpdateDownload: vi.fn().mockResolvedValue(undefined)
  }
  Object.defineProperty(window, 'flow', { configurable: true, value: api })
  return { api, push: (status: UpdateStatus) => act(() => push(status)) }
}

describe('UpdatePrompt', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('stays hidden until an update is ready, then restarts into it', async () => {
    const { api, push } = stubFlow(BASE)
    render(<UpdatePrompt />)
    expect(screen.queryByText(/is ready/)).not.toBeInTheDocument()

    push({ ...BASE, phase: 'ready', version: '0.1.20' })
    expect(await screen.findByText('Noma 0.1.20 is ready')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Restart and update'))
    expect(api.installUpdate).toHaveBeenCalled()
  })

  it('"Later" hides it for that version, but a newer one asks again', async () => {
    const { push } = stubFlow({ ...BASE, phase: 'ready', version: '0.1.20' })
    render(<UpdatePrompt />)
    fireEvent.click(await screen.findByText('Later'))
    expect(screen.queryByText('Noma 0.1.20 is ready')).not.toBeInTheDocument()

    push({ ...BASE, phase: 'ready', version: '0.1.21' })
    expect(await screen.findByText('Noma 0.1.21 is ready')).toBeInTheDocument()
  })

  it('offers the download page to a copy that cannot update itself', async () => {
    const { api } = stubFlow({ ...BASE, phase: 'available', version: '0.1.20' })
    render(<UpdatePrompt />)
    fireEvent.click(await screen.findByText('Download'))
    expect(api.openUpdateDownload).toHaveBeenCalled()
  })
})
