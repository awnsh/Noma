// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
// Also imported by src/test/setup.ts at runtime; imported again here so
// tsc (which typechecks this file independent of vitest's setupFiles) sees
// the jest-dom matcher types too.
import '@testing-library/jest-dom/vitest'
import type { DeviceStatus, FlowApi } from '@shared/types'
import { OnboardingHardwareScreen } from './OnboardingHardwareScreen'
import { useHardwareStore } from '../stores/hardwareStore'

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return {
    getHardwareStatus: vi.fn(),
    onHardwareStatusChanged: vi.fn(() => () => {}),
    onDeviceEvent: vi.fn(() => () => {}),
    onActionExecuted: vi.fn(() => () => {}),
    pingHardware: vi.fn(),
    ...overrides
  } as unknown as FlowApi
}

const VIRTUAL_CONNECTED: DeviceStatus = {
  connected: true,
  deviceType: 'virtual',
  protocolVersion: '0.1.0',
  controls: [],
  displays: {},
  modules: []
}

const PHYSICAL_CONNECTED: DeviceStatus = {
  ...VIRTUAL_CONNECTED,
  deviceType: 'stm32'
}

beforeEach(() => {
  useHardwareStore.setState({ status: VIRTUAL_CONNECTED, lastEvent: null, lastExecution: null, isLoading: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OnboardingHardwareScreen', () => {
  it('offers "Continue with Virtual Noma" when only the virtual device is present (today\'s only real case)', async () => {
    window.flow = mockFlow({ getHardwareStatus: vi.fn().mockResolvedValue(VIRTUAL_CONNECTED) })

    render(<OnboardingHardwareScreen onContinue={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Continue with Virtual Noma' })).toBeInTheDocument()
    expect(await screen.findByText('Waiting for Noma…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it('shows "Noma connected" and a plain Continue when a real device is connected', async () => {
    window.flow = mockFlow({ getHardwareStatus: vi.fn().mockResolvedValue(PHYSICAL_CONNECTED) })

    render(<OnboardingHardwareScreen onContinue={vi.fn()} />)

    expect(await screen.findByText('Noma connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Virtual Noma' })).not.toBeInTheDocument()
  })

  it('passes hardwareSkipped=false when continuing with a real device', async () => {
    window.flow = mockFlow({ getHardwareStatus: vi.fn().mockResolvedValue(PHYSICAL_CONNECTED) })
    const onContinue = vi.fn()

    render(<OnboardingHardwareScreen onContinue={onContinue} />)

    const button = await screen.findByRole('button', { name: 'Continue' })
    fireEvent.click(button)

    expect(onContinue).toHaveBeenCalledWith(false)
  })

  it('passes hardwareSkipped=true when continuing with the virtual device', async () => {
    window.flow = mockFlow({ getHardwareStatus: vi.fn().mockResolvedValue(VIRTUAL_CONNECTED) })
    const onContinue = vi.fn()

    render(<OnboardingHardwareScreen onContinue={onContinue} />)

    const button = await screen.findByRole('button', { name: 'Continue with Virtual Noma' })
    fireEvent.click(button)

    expect(onContinue).toHaveBeenCalledWith(true)
  })

  it('shows the error copy and a Retry action when a manual check fails', async () => {
    window.flow = mockFlow({
      getHardwareStatus: vi.fn().mockResolvedValue(VIRTUAL_CONNECTED),
      pingHardware: vi.fn().mockResolvedValue({ ok: false, latencyMs: 0 })
    })

    render(<OnboardingHardwareScreen onContinue={vi.fn()} />)

    const checkAgain = await screen.findByRole('button', { name: 'Check again' })
    fireEvent.click(checkAgain)

    await waitFor(() => expect(screen.getByText("Noma couldn't connect.")).toBeInTheDocument())
    expect(screen.getByText('Check your USB connection and try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
