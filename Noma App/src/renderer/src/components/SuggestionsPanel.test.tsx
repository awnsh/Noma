// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { FlowApi, Suggestion } from '@shared/types'
import { SuggestionsPanel } from './SuggestionsPanel'
import { useSuggestionsStore } from '../stores/suggestionsStore'

const PENDING_SUGGESTION: Suggestion = {
  id: 'sug-1',
  title: 'Add Command Palette to a control',
  explanation: "You've used Ctrl+Shift+P 12 times today.",
  confidence: 0.92,
  status: 'pending',
  createdAt: Date.now(),
  applicationId: 'code'
}

function mockFlow(overrides: Partial<FlowApi> = {}): FlowApi {
  return {
    getSuggestions: vi.fn().mockResolvedValue([]),
    onSuggestionsChanged: vi.fn(() => () => {}),
    ...overrides
  } as unknown as FlowApi
}

beforeEach(() => {
  useSuggestionsStore.setState({ suggestions: [], isLoading: true })
})

describe('SuggestionsPanel', () => {
  it('renders nothing while the initial fetch is in flight (no flash of the empty state)', () => {
    useSuggestionsStore.setState({ isLoading: true })
    window.flow = mockFlow({ getSuggestions: vi.fn(() => new Promise<Suggestion[]>(() => {})) })

    const { container } = render(<SuggestionsPanel />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows an explanatory empty state instead of vanishing when there are no suggestions', async () => {
    window.flow = mockFlow({ getSuggestions: vi.fn().mockResolvedValue([]) })

    render(<SuggestionsPanel />)

    expect(await screen.findByText(/Noma hasn.t noticed a pattern yet\./)).toBeInTheDocument()
    expect(screen.getByText(/Keep working normally/)).toBeInTheDocument()
  })

  it('renders the real suggestion list once one exists, not the empty state', async () => {
    window.flow = mockFlow({ getSuggestions: vi.fn().mockResolvedValue([PENDING_SUGGESTION]) })

    render(<SuggestionsPanel />)

    expect(await screen.findByText('Add Command Palette to a control')).toBeInTheDocument()
    expect(screen.queryByText(/Noma hasn.t noticed a pattern yet\./)).not.toBeInTheDocument()
  })

  it('shows which application a suggestion came from when the card carries one', async () => {
    window.flow = mockFlow({
      getSuggestions: vi
        .fn()
        .mockResolvedValue([{ ...PENDING_SUGGESTION, applicationName: 'Visual Studio Code' }])
    })

    render(<SuggestionsPanel />)

    expect(await screen.findByText('Visual Studio Code')).toBeInTheDocument()
  })

  it('renders no app tag when a suggestion has no applicationName (e.g. a pre-existing row)', async () => {
    window.flow = mockFlow({ getSuggestions: vi.fn().mockResolvedValue([PENDING_SUGGESTION]) })

    render(<SuggestionsPanel />)

    await screen.findByText('Add Command Palette to a control')
    expect(screen.queryByText('Visual Studio Code')).not.toBeInTheDocument()
  })
})
