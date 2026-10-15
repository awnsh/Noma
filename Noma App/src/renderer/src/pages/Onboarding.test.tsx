// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
// Also imported by src/test/setup.ts at runtime; imported again here so
// tsc (which typechecks this file independent of vitest's setupFiles) sees
// the jest-dom matcher types too.
import '@testing-library/jest-dom/vitest'
import type { ApplicationProfile, FlowApi, GlideState, OnboardingState } from '@shared/types'
import { Onboarding } from './Onboarding'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useUiStore } from '../stores/uiStore'
import { useGlideStore } from '../stores/glideStore'

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  step: 'welcome',
  selectedUseCases: [],
  flowEnabled: false,
  hardwareSkipped: false
}

const GLIDE_OFF: GlideState = { enabled: false, zoneCount: 4, platformSupported: true, touchpads: null, error: null }
const GLIDE_ON: GlideState = { ...GLIDE_OFF, enabled: true, touchpads: 1 }

const CHROME = { id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe' }
const CHROME_PROFILE: ApplicationProfile = {
  id: 'chrome-default',
  applicationId: 'chrome',
  name: 'Browsing',
  controls: [
    { id: 'c1', slot: 1, label: 'NEW TAB', action: { type: 'shortcut', keys: ['Control', 'T'] } },
    { id: 'c2', slot: 2, label: 'REOPEN TAB', action: { type: 'shortcut', keys: ['Control', 'Shift', 'T'] } },
    { id: 'c3', slot: 3, label: 'RELOAD', action: { type: 'shortcut', keys: ['Control', 'R'] } },
    { id: 'c4', slot: 4, label: 'FIND', action: { type: 'shortcut', keys: ['Control', 'F'] } }
  ],
  macroIds: [],
  moduleRecommendationIds: []
}

function mockFlow(glide: GlideState = GLIDE_OFF, overrides: Partial<FlowApi> = {}): FlowApi {
  return {
    getOnboardingState: vi.fn().mockResolvedValue(DEFAULT_STATE),
    saveOnboardingState: vi.fn(async (update: Partial<OnboardingState>) => ({ ...DEFAULT_STATE, ...update })),
    setWorkflowMonitoringEnabled: vi.fn().mockResolvedValue(true),
    getGlideState: vi.fn().mockResolvedValue(glide),
    setGlideEnabled: vi.fn().mockResolvedValue(GLIDE_ON),
    getHoloTouchCheckLast: vi.fn().mockResolvedValue(null),
    getActiveContext: vi.fn().mockResolvedValue({ application: null, profile: null }),
    getFlowStatus: vi.fn().mockResolvedValue({ actionsObservedToday: 0, patternsDetected: 0, suggestionsCount: 0 }),
    onActiveContextChanged: vi.fn(() => () => {}),
    listApplicationProfileSummaries: vi.fn().mockResolvedValue([{ application: CHROME, hasProfile: true }]),
    getProfileForApplication: vi.fn().mockResolvedValue(CHROME_PROFILE),
    ...overrides
  } as unknown as FlowApi
}

function seed(initialState: OnboardingState = DEFAULT_STATE, glide: GlideState | null = GLIDE_OFF): void {
  useOnboardingStore.setState({ state: initialState, isLoading: false })
  // Deliberately not 'home', so the finish test sees it change.
  useUiStore.setState({ activePage: 'settings' })
  useGlideStore.setState({ state: glide, lastActivity: null, isChanging: false })
}

beforeEach(() => {
  seed()
})

describe('Onboarding', () => {
  it('starts on Welcome, saying what Noma does in one breath', () => {
    window.flow = mockFlow()
    render(<Onboarding />)
    expect(screen.getByText('Welcome to Noma')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('resumes at the saved step', () => {
    window.flow = mockFlow()
    seed({ ...DEFAULT_STATE, step: 'flow' })
    render(<Onboarding />)
    expect(screen.getByText('Let Noma notice your repeats')).toBeInTheDocument()
  })

  it('treats a step saved by an older build as the start', () => {
    window.flow = mockFlow()
    seed({ ...DEFAULT_STATE, step: 'hardware' as OnboardingState['step'] })
    render(<Onboarding />)
    expect(screen.getByText('Welcome to Noma')).toBeInTheDocument()
  })

  it('turns Glide on, then waits for one real (practice) swipe before moving on', async () => {
    window.flow = mockFlow()
    seed({ ...DEFAULT_STATE, step: 'glide' })
    render(<Onboarding />)
    // Let the screen's own state refresh land first, as it would in use.
    await act(async () => {})

    fireEvent.click(screen.getByRole('button', { name: 'Turn on Glide' }))
    expect(window.flow.setGlideEnabled).toHaveBeenCalledWith(true)

    expect(await screen.findByRole('button', { name: 'Waiting for a swipe…' })).toBeDisabled()

    act(() => {
      useGlideStore.setState({
        lastActivity: { type: 'fire', zone: 'topLeft', slot: 1, at: Date.now() + 1, outcome: 'practice' }
      })
    })
    expect(await screen.findByText(/That's it: upper left zone/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('says plainly when Glide can’t work here, and lets you carry on', () => {
    window.flow = mockFlow({ ...GLIDE_OFF, platformSupported: false })
    seed({ ...DEFAULT_STATE, step: 'glide' }, { ...GLIDE_OFF, platformSupported: false })
    render(<Onboarding />)
    expect(screen.getByRole('button', { name: 'Continue without Glide' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn on Glide' })).not.toBeInTheDocument()
  })

  it('"Not now" on the Flow screen persists flowEnabled:false without touching capture', () => {
    window.flow = mockFlow()
    seed({ ...DEFAULT_STATE, step: 'flow' })
    render(<Onboarding />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(window.flow.setWorkflowMonitoringEnabled).not.toHaveBeenCalled()
    expect(window.flow.saveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ flowEnabled: false, step: 'firstAction' })
    )
  })

  it('"Turn on Flow" turns on the real capture switch', async () => {
    window.flow = mockFlow()
    seed({ ...DEFAULT_STATE, step: 'flow' })
    render(<Onboarding />)
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Flow' }))

    expect(window.flow.setWorkflowMonitoringEnabled).toHaveBeenCalledWith(true)
    await vi.waitFor(() =>
      expect(window.flow.saveOnboardingState).toHaveBeenCalledWith(
        expect.objectContaining({ flowEnabled: true, step: 'firstAction' })
      )
    )
  })

  it('first action: shows the app’s zones, waits for a swipe that really ran, then finishes', async () => {
    window.flow = mockFlow(GLIDE_ON)
    seed({ ...DEFAULT_STATE, step: 'firstAction' }, GLIDE_ON)
    render(<Onboarding />)

    expect(await screen.findByText('2. Swipe in from the upper left: “NEW TAB”.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeInTheDocument()

    act(() => {
      useGlideStore.setState({
        lastActivity: {
          type: 'fire',
          zone: 'topLeft',
          slot: 1,
          at: Date.now() + 1,
          outcome: 'pressed',
          controlLabel: 'NEW TAB',
          applicationName: 'Google Chrome'
        }
      })
    })
    expect(await screen.findByText('It worked.')).toBeInTheDocument()
    expect(screen.getByText(/“NEW TAB” ran in Google Chrome/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start using Noma' }))
    await vi.waitFor(() => expect(useUiStore.getState().activePage).toBe('home'))
    expect(window.flow.saveOnboardingState).toHaveBeenCalledWith(expect.objectContaining({ completed: true }))
  })

  it('first action: a practice swipe (Noma in front) is explained, not counted', async () => {
    window.flow = mockFlow(GLIDE_ON)
    seed({ ...DEFAULT_STATE, step: 'firstAction' }, GLIDE_ON)
    render(<Onboarding />)
    await screen.findByText('2. Swipe in from the upper left: “NEW TAB”.')

    act(() => {
      useGlideStore.setState({
        lastActivity: { type: 'fire', zone: 'topLeft', slot: 1, at: Date.now() + 1, outcome: 'practice' }
      })
    })
    expect(await screen.findByText(/Noma was in front, so it was practice/)).toBeInTheDocument()
    expect(screen.queryByText('It worked.')).not.toBeInTheDocument()
  })
})
