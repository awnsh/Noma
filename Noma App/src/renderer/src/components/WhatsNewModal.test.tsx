// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { WhatsNew } from '@shared/types'
import { WhatsNewModal } from './WhatsNewModal'

const WHATS_NEW: WhatsNew = {
  version: '0.1.9',
  releases: [
    { version: '0.1.9', notes: ['Newest change.'] },
    { version: '0.1.8', notes: ['Earlier change.'] }
  ]
}

function stubFlow(whatsNew: WhatsNew | null): { dismissWhatsNew: ReturnType<typeof vi.fn> } {
  const api = {
    getWhatsNew: vi.fn().mockResolvedValue(whatsNew),
    dismissWhatsNew: vi.fn().mockResolvedValue(undefined)
  }
  Object.defineProperty(window, 'flow', { configurable: true, value: api })
  return api
}

describe('WhatsNewModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows every version since the last one seen, newest first', async () => {
    stubFlow(WHATS_NEW)
    render(<WhatsNewModal />)
    expect(await screen.findByText('Updated to 0.1.9')).toBeInTheDocument()
    expect(screen.getByText('Newest change.')).toBeInTheDocument()
    expect(screen.getByText('Also in 0.1.8')).toBeInTheDocument()
    expect(screen.getByText('Earlier change.')).toBeInTheDocument()
  })

  it('marks it seen when closed', async () => {
    const api = stubFlow(WHATS_NEW)
    render(<WhatsNewModal />)
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(api.dismissWhatsNew).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape too', async () => {
    const api = stubFlow(WHATS_NEW)
    render(<WhatsNewModal />)
    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(api.dismissWhatsNew).toHaveBeenCalledTimes(1))
  })

  it('renders nothing when this launch did not follow an update', async () => {
    stubFlow(null)
    const { container } = render(<WhatsNewModal />)
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })
})
