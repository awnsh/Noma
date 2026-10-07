// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Suggestion, WorkflowNotice as WorkflowNoticeData } from '@shared/types'
import { WorkflowNotice } from './WorkflowNotice'

const SUGGESTION: Suggestion = {
  id: 'suggestion:multistep:x',
  title: 'Create a workflow action?',
  explanation: 'Noma noticed you repeatedly performing this sequence.',
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
  }
}

const NOTICE: WorkflowNoticeData = { suggestion: SUGGESTION, occurrenceCount: 6 }

/** jsdom has no matchMedia; usePrefersReducedMotion asks for it on mount. */
function stubReducedMotion(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: reduced,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn()
    })
  })
}

beforeEach(() => {
  stubReducedMotion(false)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

const renderNotice = (overrides: Partial<Parameters<typeof WorkflowNotice>[0]> = {}) => {
  const onDismiss = vi.fn()
  const onAccept = vi.fn()
  const onInteractiveChange = vi.fn()
  render(
    <WorkflowNotice
      notice={NOTICE}
      onDismiss={onDismiss}
      onAccept={onAccept}
      onInteractiveChange={onInteractiveChange}
      autoDismissMs={1000}
      {...overrides}
    />
  )
  return { onDismiss, onAccept, onInteractiveChange }
}

describe('WorkflowNotice', () => {
  it('states who is talking, what was noticed, and the workflow itself', () => {
    renderNotice()
    // The real lockup, not a typeset name. Announced exactly once,
    // since the mark and the wordmark are one logo between them.
    expect(screen.getByAltText('Noma')).toBeInTheDocument()
    expect(screen.getByText('New workflow detected')).toBeInTheDocument()
    // The real chain, from the suggestion's own steps. Not a hardcoded string.
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('6x')).toBeInTheDocument()
  })

  it('can be closed outright, without that counting against the workflow', () => {
    const { onDismiss, onAccept } = renderNotice()
    fireEvent.click(screen.getByLabelText('Close'))
    act(() => void vi.advanceTimersByTime(300))
    // 'closed', not 'dismissed': shutting a card that appeared over your work
    // says "not now, I'm busy", not "this is a bad idea". Only the deliberate
    // "Not now" under Review marks the workflow itself dismissed.
    expect(onDismiss).toHaveBeenCalledWith('closed')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('can be closed from the review state too', () => {
    const { onDismiss } = renderNotice()
    fireEvent.click(screen.getByRole('button', { name: /Review/ }))
    fireEvent.click(screen.getByLabelText('Close'))
    act(() => void vi.advanceTimersByTime(300))
    expect(onDismiss).toHaveBeenCalledWith('closed')
  })

  it('offers one action, and no marketing', () => {
    renderNotice()
    expect(screen.getByRole('button', { name: /Review/ })).toBeInTheDocument()
    expect(screen.queryByText(/\bAI\b/)).toBeNull()
    expect(screen.queryByText(/!/)).toBeNull()
  })

  it('dismisses itself after its timeout, reporting that nobody answered', () => {
    const { onDismiss } = renderNotice()
    act(() => void vi.advanceTimersByTime(1000))
    act(() => void vi.advanceTimersByTime(300)) // the exit animation
    expect(onDismiss).toHaveBeenCalledWith('timeout')
  })

  it('pauses the countdown while the pointer is over it', () => {
    const { onDismiss } = renderNotice()
    fireEvent.mouseEnter(screen.getByRole('status'))
    act(() => void vi.advanceTimersByTime(5000))
    expect(onDismiss).not.toHaveBeenCalled()

    fireEvent.mouseLeave(screen.getByRole('status'))
    act(() => void vi.advanceTimersByTime(1300))
    expect(onDismiss).toHaveBeenCalledWith('timeout')
  })

  it('lets the window take clicks only while the pointer is on the card', () => {
    const { onInteractiveChange } = renderNotice()
    fireEvent.mouseEnter(screen.getByRole('status'))
    expect(onInteractiveChange).toHaveBeenLastCalledWith(true)
    fireEvent.mouseLeave(screen.getByRole('status'))
    expect(onInteractiveChange).toHaveBeenLastCalledWith(false)
  })

  it('stops the countdown for good once the user opens the review', () => {
    const { onDismiss } = renderNotice()
    fireEvent.click(screen.getByRole('button', { name: /Review/ }))
    // Leaving the card again must not restart a timer under someone who is
    // reading it. They already told us they were interested.
    fireEvent.mouseLeave(screen.getByRole('status'))
    act(() => void vi.advanceTimersByTime(10_000))
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('shows why Noma raised it, and both answers, on review', () => {
    renderNotice()
    fireEvent.click(screen.getByRole('button', { name: /Review/ }))
    expect(screen.getByText(SUGGESTION.explanation)).toBeInTheDocument()
    expect(screen.getByText('Review steps in Noma')).toBeInTheDocument()
    expect(screen.getByText('Not now')).toBeInTheDocument()
  })

  it('treats "Not now" as a real answer and "Review steps in Noma" as acceptance', () => {
    const { onDismiss, onAccept } = renderNotice()
    fireEvent.click(screen.getByRole('button', { name: /Review/ }))
    fireEvent.click(screen.getByText('Not now'))
    act(() => void vi.advanceTimersByTime(300))
    expect(onDismiss).toHaveBeenCalledWith('dismissed')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('accepts without dismissing itself. Main decides what happens next', () => {
    const { onAccept } = renderNotice()
    fireEvent.click(screen.getByRole('button', { name: /Review/ }))
    fireEvent.click(screen.getByText('Review steps in Noma'))
    expect(onAccept).toHaveBeenCalled()
  })

  it('animates on entry, and does not when the user asked for less motion', () => {
    const { unmount } = render(
      <WorkflowNotice notice={NOTICE} onDismiss={vi.fn()} onAccept={vi.fn()} autoDismissMs={9999} />
    )
    expect(screen.getByRole('status').style.animation).toContain('noma-notice-in')
    unmount()

    stubReducedMotion(true)
    render(<WorkflowNotice notice={NOTICE} onDismiss={vi.fn()} onAccept={vi.fn()} autoDismissMs={9999} />)
    expect(screen.getByRole('status').style.animation).toBe('')
  })

  it('announces itself politely, so it never cuts a screen reader off', () => {
    renderNotice()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
