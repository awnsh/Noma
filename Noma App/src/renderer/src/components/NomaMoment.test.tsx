// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ApplicationProfile, FlowApi, Suggestion } from '@shared/types'
import { NomaMoment } from './NomaMoment'
import { useSuggestionsStore } from '../stores/suggestionsStore'

const WORKFLOW_SUGGESTION: Suggestion = {
  id: 'suggestion:multistep:x',
  title: 'Create a workflow action?',
  explanation: 'irrelevant once structured data is present',
  confidence: 0.82,
  status: 'pending',
  createdAt: Date.now(),
  applicationId: 'code',
  applicationName: 'Visual Studio Code',
  chainApplicationNames: { code: 'Visual Studio Code', claude: 'Claude Code' },
  action: {
    kind: 'createWorkflowMacroAndAssignToControl',
    steps: [
      { type: 'shortcut', applicationId: 'code', comboKeys: ['Meta', 'Shift', 'S'] },
      { type: 'appSwitch', applicationId: 'claude' },
      { type: 'shortcut', applicationId: 'claude', comboKeys: ['Control', 'V'] }
    ]
  },
  confidenceBreakdown: {
    occurrenceCount: 8,
    threshold: 3,
    baseConfidence: 0.75,
    historyBias: 0,
    priorAccepted: 0,
    priorRejected: 0
  }
}

const PROFILE: ApplicationProfile = {
  id: 'code-default',
  applicationId: 'code',
  name: 'Developer',
  controls: [
    { id: 'c1', slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
    { id: 'c2', slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } },
    { id: 'c3', slot: 3, label: 'TERMINAL', action: { type: 'shortcut', keys: ['Control', 'Backquote'] } },
    { id: 'c4', slot: 4, label: 'SEARCH', action: { type: 'shortcut', keys: ['Control', 'Shift', 'F'] } }
  ],
  macroIds: [],
  moduleRecommendationIds: []
}

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return { ...overrides } as unknown as FlowApi
}

beforeEach(() => {
  useSuggestionsStore.setState({ suggestions: [WORKFLOW_SUGGESTION] })
})

describe('NomaMoment', () => {
  it('shows the workflow chain and a human occurrence sentence, never the raw title', () => {
    window.flow = mockFlow()
    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByText('Noma noticed')).toBeInTheDocument()
    expect(screen.getByText("You've repeated this workflow 8 times in Visual Studio Code.")).toBeInTheDocument()
    expect(screen.getByText('Screenshot')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Paste')).toBeInTheDocument()
    expect(screen.queryByText('Create a workflow action?')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument()
  })

  it('keeps confidence and feedback tucked behind a single quiet "More" toggle by default', () => {
    window.flow = mockFlow()
    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.queryByText('Noma noticed a strong pattern')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument()
    expect(screen.queryByText('Not useful')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('More'))
    expect(screen.getByText('Not useful')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Why Noma suggested this'))
    expect(screen.getByText(/Noma noticed a strong pattern/)).toBeInTheDocument()
  })

  it('shows the exact steps (with warnings) before saving, then saves to the chosen Glide zone', async () => {
    const getProfileForApplication = vi.fn().mockResolvedValue(PROFILE)
    const previewSuggestionAction = vi.fn().mockResolvedValue({
      steps: [
        { kind: 'shortcut', description: 'Screenshot (Win+Shift+S)' },
        { kind: 'focus', description: 'Switch to Claude Code (it has to be open already)' },
        { kind: 'shortcut', description: 'Paste (Ctrl+V)' },
        { kind: 'shortcut', description: 'Press Enter, to send what was just pasted', added: true }
      ],
      replayable: true
    })
    const assignSuggestionToControl = vi.fn().mockResolvedValue({ suggestion: { ...WORKFLOW_SUGGESTION, status: 'accepted' }, profile: PROFILE })
    window.flow = mockFlow({ getProfileForApplication, previewSuggestionAction, assignSuggestionToControl })

    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={vi.fn()} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByText('Review steps'))

    expect(await screen.findByText('Press Enter, to send what was just pasted')).toBeInTheDocument()
    expect(screen.getByText('(added by Noma)')).toBeInTheDocument()
    expect(assignSuggestionToControl).not.toHaveBeenCalled()

    // Slot buttons are named after the Glide zone that presses them.
    expect(screen.getByText('Upper right')).toBeInTheDocument()
    getProfileForApplication.mockResolvedValue({
      ...PROFILE,
      controls: PROFILE.controls.map((c) => (c.slot === 2 ? { ...c, label: 'Screenshot…', action: { type: 'macro', macroId: 'm1' } } : c))
    })
    fireEvent.click(screen.getByText('DEBUG'))

    await waitFor(() => expect(assignSuggestionToControl).toHaveBeenCalledWith(WORKFLOW_SUGGESTION.id, 2))
    expect(await screen.findByText('Screenshot…')).toBeInTheDocument()
    expect(screen.getByText(/Now on the upper right Glide zone in Visual Studio Code/)).toBeInTheDocument()
  })

  it('flags steps that may not replay, without hiding the save', async () => {
    window.flow = mockFlow({
      getProfileForApplication: vi.fn().mockResolvedValue(PROFILE),
      previewSuggestionAction: vi.fn().mockResolvedValue({
        steps: [{ kind: 'click', description: 'Click a spot in the top-left', warning: 'The click goes by position.' }],
        replayable: false
      })
    })
    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={vi.fn()} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByText('Review steps'))

    expect(await screen.findByText('The click goes by position.')).toBeInTheDocument()
    expect(screen.getByText(/Some steps may not replay reliably/)).toBeInTheDocument()
    expect(await screen.findByText('DEBUG')).toBeInTheDocument()
  })

  it('labels a Demo Mode suggestion as simulated, never as something Noma noticed', () => {
    window.flow = mockFlow()
    render(<NomaMoment suggestion={{ ...WORKFLOW_SUGGESTION, isDemo: true }} onReject={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Demo workflow')).toBeInTheDocument()
    expect(screen.getByText('Simulated by Demo Mode, not learned from you')).toBeInTheDocument()
    expect(screen.queryByText('Noma noticed')).not.toBeInTheDocument()
  })

  it('offers an acknowledge-only path (no slot picker) for an informational suggestion with no action', async () => {
    const resolveSuggestion = vi.fn().mockResolvedValue({ ...WORKFLOW_SUGGESTION, status: 'accepted' })
    window.flow = mockFlow({ resolveSuggestion })

    const informational: Suggestion = { ...WORKFLOW_SUGGESTION, applicationId: null, action: undefined }
    render(<NomaMoment suggestion={informational} onReject={vi.fn()} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByText('Sounds right'))
    expect(await screen.findByText(/accepting just remembers/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Accept'))
    await waitFor(() => expect(resolveSuggestion).toHaveBeenCalledWith(informational.id, 'accepted'))
    expect(await screen.findByText('Noted')).toBeInTheDocument()
  })

  it('sets up controls for an app that has none yet, instead of only bookmarking the workflow', async () => {
    const notepad = { id: 'notepad', name: 'Notepad', processName: 'notepad.exe' }
    const created: ApplicationProfile = { ...PROFILE, id: 'notepad-1', applicationId: 'notepad', name: 'Notepad' }
    const getProfileForApplication = vi.fn().mockResolvedValue(null)
    const listApplicationProfileSummaries = vi
      .fn()
      .mockResolvedValue([{ application: notepad, hasProfile: false }])
    const createProfileForApplication = vi.fn().mockResolvedValue(created)
    const previewSuggestionAction = vi.fn().mockResolvedValue({ steps: [], replayable: true })
    window.flow = mockFlow({ getProfileForApplication, listApplicationProfileSummaries, createProfileForApplication, previewSuggestionAction })

    const inNotepad: Suggestion = { ...WORKFLOW_SUGGESTION, applicationId: 'notepad', applicationName: 'Notepad' }
    render(<NomaMoment suggestion={inNotepad} onReject={vi.fn()} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByText('Review steps'))

    await waitFor(() => expect(createProfileForApplication).toHaveBeenCalledWith(notepad, 'Notepad'))
    expect(await screen.findByText(/Which Glide zone in Notepad should run it/)).toBeInTheDocument()
    expect(screen.queryByText(/accepting just remembers/i)).not.toBeInTheDocument()
  })

  it('calls onDismiss for "Not now" and onReject for "Not useful", never resolving on its own', () => {
    window.flow = mockFlow()
    const onDismiss = vi.fn()
    const onReject = vi.fn()
    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={onReject} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByText('Not now'))
    expect(onDismiss).toHaveBeenCalledWith(WORKFLOW_SUGGESTION.id)

    fireEvent.click(screen.getByText('More'))
    fireEvent.click(screen.getByText('Not useful'))
    // Asks why first; nothing is resolved until an answer (or Skip).
    expect(onReject).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Skip'))
    expect(onReject).toHaveBeenCalledWith(WORKFLOW_SUGGESTION.id)
  })

  it('passes the reason picked for "Not useful"', () => {
    window.flow = mockFlow()
    const onReject = vi.fn()
    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={onReject} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByText('More'))
    fireEvent.click(screen.getByText('Not useful'))
    fireEvent.click(screen.getByText('The steps are wrong'))
    expect(onReject).toHaveBeenCalledWith(WORKFLOW_SUGGESTION.id, 'wrongSteps')
  })
})
