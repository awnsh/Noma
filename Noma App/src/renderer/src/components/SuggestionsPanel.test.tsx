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

    // The raw, configuration-flavored `title` field is no longer shown —
    // NomaMoment replaces it with human framing (see NomaMoment.test.tsx);
    // the suggestion's own explanation text is still real, still rendered.
    expect(await screen.findByText(PENDING_SUGGESTION.explanation)).toBeInTheDocument()
    expect(screen.queryByText(/Noma hasn.t noticed a pattern yet\./)).not.toBeInTheDocument()
  })

  it("folds which application a suggestion came from into its sentence when the card carries a real count", async () => {
    const withCount: Suggestion = {
      ...PENDING_SUGGESTION,
      applicationName: 'Visual Studio Code',
      confidenceBreakdown: {
        occurrenceCount: 12,
        threshold: 5,
        baseConfidence: 0.85,
        historyBias: 0,
        priorAccepted: 0,
        priorRejected: 0
      }
    }
    window.flow = mockFlow({ getSuggestions: vi.fn().mockResolvedValue([withCount]) })

    render(<SuggestionsPanel />)

    expect(await screen.findByText("You've repeated this workflow 12 times in Visual Studio Code.")).toBeInTheDocument()
  })

  it('falls back to the raw explanation (no app name) for a suggestion with no real count', async () => {
    window.flow = mockFlow({ getSuggestions: vi.fn().mockResolvedValue([PENDING_SUGGESTION]) })

    render(<SuggestionsPanel />)

    await screen.findByText(PENDING_SUGGESTION.explanation)
    expect(screen.queryByText('Visual Studio Code')).not.toBeInTheDocument()
  })
})
