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

  it('walks through Create action -> pick a slot -> success, ending on the real assigned label', async () => {
    const getProfileForApplication = vi.fn().mockResolvedValue(PROFILE)
    const assignSuggestionToControl = vi.fn().mockResolvedValue({
      suggestion: { ...WORKFLOW_SUGGESTION, status: 'accepted' },
      profile: {
        ...PROFILE,
        controls: PROFILE.controls.map((c) =>
          c.slot === 2 ? { ...c, label: 'Screenshot…', action: { type: 'macro', macroId: 'm1' } } : c
        )
      }
    })
    window.flow = mockFlow({ getProfileForApplication, assignSuggestionToControl })

    render(<NomaMoment suggestion={WORKFLOW_SUGGESTION} onReject={vi.fn()} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByText('Create action'))
    await waitFor(() => expect(getProfileForApplication).toHaveBeenCalledWith('code'))

    const slot2Button = await screen.findByText('DEBUG')
    fireEvent.click(slot2Button)

    await waitFor(() => expect(assignSuggestionToControl).toHaveBeenCalledWith(WORKFLOW_SUGGESTION.id, 2))
    expect(await screen.findByText('Action created')).toBeInTheDocument()
    expect(screen.getByText('Added to your interface.')).toBeInTheDocument()
  })

  it('offers an acknowledge-only path (no slot picker) for an informational suggestion with no action', async () => {
    const resolveSuggestion = vi.fn().mockResolvedValue({ ...WORKFLOW_SUGGESTION, status: 'accepted' })
    window.flow = mockFlow({ resolveSuggestion })

    const informational: Suggestion = { ...WORKFLOW_SUGGESTION, applicationId: null, action: undefined }
    render(<NomaMoment suggestion={informational} onReject={vi.fn()} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByText('Sounds right'))
    expect(await screen.findByText(/accepting just remembers/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Accept'))
    await waitFor(() => expect(resolveSuggestion).toHaveBeenCalledWith(informational.id, 'accepted'))
    expect(await screen.findByText('Noted')).toBeInTheDocument()
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
    expect(onReject).toHaveBeenCalledWith(WORKFLOW_SUGGESTION.id)
  })
})
