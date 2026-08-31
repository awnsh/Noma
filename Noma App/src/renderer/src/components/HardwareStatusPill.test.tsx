// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { DeviceStatus, FlowApi } from '@shared/types'
import { HardwareStatusPill } from './HardwareStatusPill'
import { useHardwareStore } from '../stores/hardwareStore'

const VIRTUAL_CONNECTED: DeviceStatus = {
  connected: true,
  deviceType: 'virtual',
  protocolVersion: '0.1.0',
  controls: [],
  displays: {},
  modules: []
}

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return {
    getHardwareStatus: vi.fn().mockResolvedValue(VIRTUAL_CONNECTED),
    onHardwareStatusChanged: vi.fn(() => () => {}),
    onDeviceEvent: vi.fn(() => () => {}),
    onActionExecuted: vi.fn(() => () => {}),
    ...overrides
  } as unknown as FlowApi
}

beforeEach(() => {
  useHardwareStore.setState({ status: VIRTUAL_CONNECTED, lastEvent: null, lastExecution: null, isLoading: true })
})

describe('HardwareStatusPill', () => {
  it('honestly reads "Virtual Noma" when only the virtual device is present (today\'s only real case)', async () => {
    window.flow = mockFlow()
    render(<HardwareStatusPill />)
    expect(await screen.findByText('Virtual Noma')).toBeInTheDocument()
  })

  it('reads "Noma connected" only for a real, non-virtual connected device', async () => {
    window.flow = mockFlow({
      getHardwareStatus: vi.fn().mockResolvedValue({ ...VIRTUAL_CONNECTED, deviceType: 'stm32' })
    })
    render(<HardwareStatusPill />)
    expect(await screen.findByText('Noma connected')).toBeInTheDocument()
  })

  it('reads "Virtual Noma" (not "connected") if the device reports disconnected', async () => {
    window.flow = mockFlow({
      getHardwareStatus: vi.fn().mockResolvedValue({ ...VIRTUAL_CONNECTED, deviceType: 'stm32', connected: false })
    })
    render(<HardwareStatusPill />)
    expect(await screen.findByText('Virtual Noma')).toBeInTheDocument()
  })
})
