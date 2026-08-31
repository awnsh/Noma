// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
// Also imported by src/test/setup.ts at runtime; imported again here so
// tsc (which typechecks this file independent of vitest's setupFiles) sees
// the jest-dom matcher types too.
import '@testing-library/jest-dom/vitest'
import type { DeviceStatus, FlowApi, OnboardingState } from '@shared/types'
import { Onboarding } from './Onboarding'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useUiStore } from '../stores/uiStore'
import { useHardwareStore } from '../stores/hardwareStore'
import { useWorkflowStore } from '../stores/workflowStore'

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  step: 'welcome',
  selectedUseCases: [],
  flowEnabled: false,
  hardwareSkipped: false
}

const VIRTUAL_STATUS: DeviceStatus = {
  connected: true,
  deviceType: 'virtual',
  protocolVersion: '0.1.0',
  controls: [],
  displays: {},
  modules: []
}

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return {
    getOnboardingState: vi.fn().mockResolvedValue(DEFAULT_STATE),
    saveOnboardingState: vi.fn(async (update: Partial<OnboardingState>) => ({ ...DEFAULT_STATE, ...update })),
    setWorkflowMonitoringEnabled: vi.fn().mockResolvedValue(true),
    getWorkflowMonitoringEnabled: vi.fn().mockResolvedValue(false),
    getDetectedPatterns: vi.fn().mockResolvedValue([]),
    getHardwareStatus: vi.fn().mockResolvedValue(VIRTUAL_STATUS),
    onHardwareStatusChanged: vi.fn(() => () => {}),
    onDeviceEvent: vi.fn(() => () => {}),
    onActionExecuted: vi.fn(() => () => {}),
    pingHardware: vi.fn().mockResolvedValue({ ok: true, latencyMs: 1 }),
    ...overrides
  } as unknown as FlowApi
}

function seedStores(initialState: OnboardingState = DEFAULT_STATE): void {
  useOnboardingStore.setState({ state: initialState, isLoading: false })
  // Deliberately not 'dashboard' — the completion test below asserts this
  // actually changes, not that it was 'dashboard' all along.
  useUiStore.setState({ activePage: 'settings' })
  useHardwareStore.setState({ status: VIRTUAL_STATUS, lastEvent: null, lastExecution: null, isLoading: false })
  useWorkflowStore.setState({ enabled: false, patterns: [], isLoading: false })
}

beforeEach(() => {
  seedStores()
})

describe('Onboarding', () => {
  it('starts on Welcome for a brand-new onboarding record', () => {
    window.flow = mockFlow()
    render(<Onboarding />)
    expect(screen.getByText('Your keyboard adapts to you.')).toBeInTheDocument()
  })

  it('resumes from a previously-persisted step instead of restarting at Welcome', () => {
    window.flow = mockFlow()
    seedStores({ ...DEFAULT_STATE, step: 'hardware' })

    render(<Onboarding />)

    expect(screen.getByText('Connect your Noma')).toBeInTheDocument()
  })

  it('keeps a use-case selection after navigating back and forward again', async () => {
    window.flow = mockFlow()
    render(<Onboarding />)

    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }))
    expect(await screen.findByText('What do you use your computer for?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true')

    // Back to Welcome, then forward again — the selection must survive.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByText('Your keyboard adapts to you.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }))
    expect(await screen.findByText('What do you use your computer for?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has no Back button on the first screen', () => {
    window.flow = mockFlow()
    render(<Onboarding />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('"Not now" on the Flow screen persists flowEnabled:false without touching capture', async () => {
    window.flow = mockFlow()
    seedStores({ ...DEFAULT_STATE, step: 'flowPrivacy' })

    render(<Onboarding />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(window.flow.setWorkflowMonitoringEnabled).not.toHaveBeenCalled()
    expect(window.flow.saveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ flowEnabled: false, step: 'hardware' })
    )
  })

  it('"Enable Flow" turns on the real capture toggle and persists flowEnabled:true', async () => {
    window.flow = mockFlow()
    seedStores({ ...DEFAULT_STATE, step: 'flowPrivacy' })

    render(<Onboarding />)
    fireEvent.click(screen.getByRole('button', { name: 'Enable Flow' }))

    expect(window.flow.setWorkflowMonitoringEnabled).toHaveBeenCalledWith(true)
    await screen.findByText('Connect your Noma')
    expect(window.flow.saveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ flowEnabled: true, step: 'hardware' })
    )
  })

  it('completing onboarding persists completed:true and switches to the Dashboard page', async () => {
    window.flow = mockFlow()
    seedStores({ ...DEFAULT_STATE, step: 'completion' })

    render(<Onboarding />)
    fireEvent.click(screen.getByRole('button', { name: 'Start using Noma' }))

    // setActivePage only runs after `await save(...)` resolves, so poll for
    // the end result rather than the (synchronously-true) call assertion.
    await vi.waitFor(() => {
      expect(useUiStore.getState().activePage).toBe('dashboard')
    })
    expect(window.flow.saveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, step: 'completion' })
    )
  })
})
