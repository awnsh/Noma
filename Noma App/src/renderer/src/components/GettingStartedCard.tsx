import { useState } from 'react'
import { useGlideStore } from '../stores/glideStore'
import { useUiStore, type Page } from '../stores/uiStore'
import { CARD } from '../lib/surfaces'

const HIDDEN_KEY = 'noma.home.gettingStartedHidden'

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

interface Step {
  done: boolean
  label: string
  hint: string
  page: Page
}

/**
 * The first few things worth doing, each ticked from real state rather than
 * from having clicked a button: Glide on, a swipe that actually ran
 * something, Flow on, a workflow saved. Goes away once everything is done,
 * or when hidden.
 */
export function GettingStartedCard({ flowEnabled, savedWorkflows }: { flowEnabled: boolean; savedWorkflows: number }) {
  const { state, hasRunAction } = useGlideStore()
  const setActivePage = useUiStore((s) => s.setActivePage)
  const [hidden, setHidden] = useState(readHidden)
  const [closing, setClosing] = useState(false)

  const glideAvailable = state?.platformSupported !== false
  const steps: Step[] = [
    ...(glideAvailable
      ? [
          { done: Boolean(state?.enabled), label: 'Turn on Glide', hint: 'One switch on the Glide page.', page: 'holo' as Page },
          {
            done: hasRunAction,
            label: 'Run an action with a swipe',
            hint: 'Switch to an app with actions and swipe in from the palm rest.',
            page: 'holo' as Page
          }
        ]
      : []),
    { done: flowEnabled, label: 'Turn on Flow', hint: 'So Noma can notice what you repeat.', page: 'workflows' },
    {
      done: savedWorkflows > 0,
      label: 'Save a workflow to a zone',
      hint: 'Review one Flow noticed. Takes a few repeats to appear.',
      page: 'workflows'
    }
  ]

  if (hidden || steps.every((step) => step.done)) return null

  const hide = (): void => {
    try {
      localStorage.setItem(HIDDEN_KEY, '1')
    } catch {
      // Storage blocked: hidden until restart.
    }
    setClosing(true)
    window.setTimeout(() => setHidden(true), 200)
  }

  return (
    <div className="noma-collapse" data-closing={closing}>
    <div className="min-h-0 overflow-hidden">
    <section className={`mb-12 p-5 ${CARD}`} aria-labelledby="getting-started-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="getting-started-title" className="font-display text-base font-semibold text-neutral-100">
          Getting started
        </h2>
        <button type="button" onClick={hide} className="text-xs text-neutral-500 hover:text-neutral-100">
          Hide
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                step.done ? 'mc-pop border-accent bg-accent' : 'border-base-600'
              }`}
            >
              {step.done && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mc-check h-3 w-3 text-white">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`text-sm ${step.done ? 'text-neutral-500 line-through' : 'text-neutral-100'}`}>
                {step.label}
              </span>
              {!step.done && <span className="block text-xs text-neutral-500">{step.hint}</span>}
            </span>
            {!step.done && (
              <button
                type="button"
                onClick={() => setActivePage(step.page)}
                className="shrink-0 text-xs text-accent hover:opacity-80"
              >
                Go
              </button>
            )}
            <span className="sr-only">{step.done ? 'Done' : 'Not done yet'}</span>
          </li>
        ))}
      </ol>
    </section>
    </div>
    </div>
  )
}
