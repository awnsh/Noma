// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
// Also imported by src/test/setup.ts at runtime; imported again here so
// tsc (which typechecks this file independent of vitest's setupFiles) sees
// the jest-dom matcher types too.
import '@testing-library/jest-dom/vitest'
import { OnboardingUseCasesScreen } from './OnboardingUseCasesScreen'

describe('OnboardingUseCasesScreen', () => {
  it('renders every use case unselected when nothing is chosen yet', () => {
    render(<OnboardingUseCasesScreen selected={[]} onToggle={vi.fn()} onContinue={vi.fn()} />)

    for (const useCase of ['Development', 'Design', 'Video', 'Writing', 'Productivity', 'Other']) {
      expect(screen.getByRole('button', { name: useCase })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('marks an already-selected use case as pressed, and supports more than one', () => {
    render(
      <OnboardingUseCasesScreen
        selected={['Development', 'Writing']}
        onToggle={vi.fn()}
        onContinue={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Development' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Writing' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle with the clicked use case, not a hardcoded one', () => {
    const onToggle = vi.fn()
    render(<OnboardingUseCasesScreen selected={[]} onToggle={onToggle} onContinue={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Video' }))

    expect(onToggle).toHaveBeenCalledWith('Video')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('lets Continue proceed with nothing selected — selection is never required', () => {
    const onContinue = vi.fn()
    render(<OnboardingUseCasesScreen selected={[]} onToggle={vi.fn()} onContinue={onContinue} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
