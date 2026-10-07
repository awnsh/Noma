// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Control, FlowApi } from '@shared/types'
import { ControlEditorModal } from './ControlEditorModal'

const MACRO_ID = 'macro-1'
const LOWER_LEFT: Control = { id: 'c3', slot: 3, label: 'TERMINAL', action: { type: 'macro', macroId: MACRO_ID } }

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return {
    getMacros: vi.fn().mockResolvedValue([{ id: MACRO_ID, name: 'A workflow', actions: [], enabled: true }]),
    updateControl: vi.fn().mockResolvedValue({ id: 'p', controls: [] }),
    clearControl: vi.fn().mockResolvedValue({ id: 'p', controls: [] }),
    testControlAction: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides
  } as unknown as FlowApi
}

function open(control: Control | undefined, props: { onClose?: () => void; onSaved?: () => void } = {}) {
  return render(
    <ControlEditorModal
      applicationId="code"
      applicationName="Visual Studio Code"
      slot={3}
      control={control}
      onClose={props.onClose ?? (() => {})}
      onSaved={props.onSaved ?? (() => {})}
    />
  )
}

beforeEach(() => {
  window.flow = mockFlow()
})

describe('ControlEditorModal', () => {
  it('opens showing the zone as it is saved right now', async () => {
    open(LOWER_LEFT)
    expect(await screen.findByDisplayValue('TERMINAL')).toBeInTheDocument()
    expect((screen.getByDisplayValue('Saved workflow') as HTMLSelectElement).value).toBe('macro')
  })

  it('saves an edited name for the zone and then closes', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    open(LOWER_LEFT, { onSaved, onClose })

    fireEvent.change(await screen.findByDisplayValue('TERMINAL'), { target: { value: 'TERM' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(window.flow.updateControl).toHaveBeenCalledWith('code', 3, 'TERM', { type: 'macro', macroId: MACRO_ID })
    expect(onSaved).toHaveBeenCalled()
  })

  it('saves a switch to a system action', async () => {
    const onClose = vi.fn()
    open(LOWER_LEFT, { onClose })

    fireEvent.change(await screen.findByDisplayValue('Saved workflow'), { target: { value: 'systemCommand' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect((window.flow.updateControl as ReturnType<typeof vi.fn>).mock.calls[0][3].type).toBe('systemCommand')
  })

  it('keeps the form open with the reason when the profile is missing', async () => {
    window.flow = mockFlow({ updateControl: vi.fn().mockResolvedValue(null) })
    const onClose = vi.fn()
    open(LOWER_LEFT, { onClose })

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/No profile configured/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clears only this zone', async () => {
    const onClose = vi.fn()
    open(LOWER_LEFT, { onClose })

    fireEvent.click(await screen.findByRole('button', { name: 'Clear zone' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(window.flow.clearControl).toHaveBeenCalledWith('code', 3)
  })

  it('opens an empty zone as a blank form with Clear disabled', async () => {
    open({ id: 'c3', slot: 3, label: '', action: { type: 'none' } })
    expect(await screen.findByPlaceholderText('e.g. RUN')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Clear zone' })).toBeDisabled()
  })

  it('says why Save is unavailable', async () => {
    open({ id: 'c3', slot: 3, label: 'TERMINAL', action: { type: 'shortcut', keys: [] } })
    expect(await screen.findByText('Record a shortcut to save.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.change(screen.getByDisplayValue('TERMINAL'), { target: { value: '' } })
    expect(screen.getByText('Give it a name to save.')).toBeInTheDocument()
  })

  it('stays usable and explains itself when saving throws', async () => {
    window.flow = mockFlow({ updateControl: vi.fn().mockRejectedValue(new Error('boom')) })
    const onClose = vi.fn()
    open(LOWER_LEFT, { onClose })

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not save this. Try again.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
  })
})
